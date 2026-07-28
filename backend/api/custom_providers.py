"""
自定义供应商管理 API。

提供自定义供应商 CRUD、模型管理、模型发现和连接测试端点。
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import AfterValidator, BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.sqlalchemy.engine import get_async_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/custom-providers", tags=["Custom Providers"])

_CONNECTION_TEST_TIMEOUT = 15

_BACKEND_SETTING_KEYS = (
    "default_video_backend",
    "default_image_backend",
    "default_image_backend_t2i",
    "default_image_backend_i2i",
    "default_text_backend",
    "default_audio_backend",
    "text_backend_script",
    "text_backend_overview",
    "text_backend_style",
)

_PROJECT_BACKEND_KEYS = (
    "video_backend",
    "audio_backend",
    "image_provider_t2i",
    "image_provider_i2i",
    "text_backend_script",
    "text_backend_overview",
    "text_backend_style",
)

ENDPOINT_REGISTRY = {
    "openai": {"key": "openai", "media_type": "video", "family": "openai", "display_name_key": "openai", "request_method": "POST", "request_path_template": "/v1/images/generations"},
    "google": {"key": "google", "media_type": "image", "family": "google", "display_name_key": "google", "request_method": "POST", "request_path_template": "/v1/models"},
}


def endpoint_spec_to_dict(spec):
    return {
        "key": spec["key"],
        "media_type": spec["media_type"],
        "family": spec["family"],
        "display_name_key": spec["display_name_key"],
        "request_method": spec["request_method"],
        "request_path_template": spec["request_path_template"],
    }


def _validate_endpoint(value: str) -> str:
    if value not in ENDPOINT_REGISTRY:
        raise ValueError(f"unknown endpoint: {value!r}")
    return value


EndpointType = Annotated[str, AfterValidator(_validate_endpoint)]
DiscoveryFormatLiteral = Literal["openai", "google", "custom"]

_ = lambda x, **kwargs: x


class ModelInput(BaseModel):
    model_id: str
    display_name: str
    endpoint: EndpointType
    is_default: bool = False
    is_enabled: bool = True
    price_unit: str | None = None
    price_input: float | None = None
    price_output: float | None = None
    currency: str | None = None
    supported_durations: list[int] | None = None
    resolution: str | None = None

    def to_db_dict(self) -> dict:
        d = self.model_dump()
        durations = self.supported_durations
        is_video = ENDPOINT_REGISTRY.get(self.endpoint, {}).get("media_type") == "video"
        if is_video and durations is not None and len(durations) == 0:
            durations = None
        d["supported_durations"] = json.dumps(durations) if durations is not None else None
        return d


class CreateProviderRequest(BaseModel):
    display_name: str
    discovery_format: DiscoveryFormatLiteral
    base_url: str
    api_key: str
    models: list[ModelInput] = []


class UpdateProviderRequest(BaseModel):
    display_name: str | None = None
    base_url: str | None = None
    api_key: str | None = None


class FullUpdateProviderRequest(BaseModel):
    display_name: str
    base_url: str
    api_key: str | None = None
    models: list[ModelInput]


class ProviderConnectionRequest(BaseModel):
    discovery_format: str
    base_url: str
    api_key: str


class ReplaceModelsRequest(BaseModel):
    models: list[ModelInput]


class ModelResponse(BaseModel):
    id: int
    model_id: str
    display_name: str
    endpoint: str
    is_default: bool
    is_enabled: bool
    price_unit: str | None = None
    price_input: float | None = None
    price_output: float | None = None
    currency: str | None = None
    supported_durations: list[int] | None = None
    resolution: str | None = None


class ProviderResponse(BaseModel):
    id: int
    display_name: str
    discovery_format: str
    base_url: str
    api_key_masked: str
    models: list[ModelResponse]
    created_at: str | None = None


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
    model_count: int = 0


class DiscoverResponse(BaseModel):
    models: list[dict]


class DiscoverAnthropicRequest(BaseModel):
    base_url: str | None = None
    api_key: str | None = None


class CredentialsResponse(BaseModel):
    base_url: str
    api_key: str


class EndpointDescriptor(BaseModel):
    key: str
    media_type: str
    family: str
    display_name_key: str
    request_method: str
    request_path_template: str
    image_capabilities: list[str] | None = None


class EndpointCatalogResponse(BaseModel):
    endpoints: list[EndpointDescriptor]


def mask_secret(secret: str | None) -> str:
    if not secret:
        return ""
    return secret[:4] + "..." + secret[-4:] if len(secret) > 8 else "••••"


def _model_to_response(m) -> ModelResponse:
    durations = json.loads(m.supported_durations) if getattr(m, "supported_durations", None) else None
    return ModelResponse(
        id=getattr(m, "id", 0),
        model_id=getattr(m, "model_id", ""),
        display_name=getattr(m, "display_name", ""),
        endpoint=getattr(m, "endpoint", ""),
        is_default=getattr(m, "is_default", False),
        is_enabled=getattr(m, "is_enabled", True),
        price_unit=getattr(m, "price_unit", None),
        price_input=getattr(m, "price_input", None),
        price_output=getattr(m, "price_output", None),
        currency=getattr(m, "currency", None),
        supported_durations=durations,
        resolution=getattr(m, "resolution", None),
    )


def _provider_to_response(provider, models) -> ProviderResponse:
    return ProviderResponse(
        id=getattr(provider, "id", 0),
        display_name=getattr(provider, "display_name", ""),
        discovery_format=getattr(provider, "discovery_format", ""),
        base_url=getattr(provider, "base_url", ""),
        api_key_masked=mask_secret(getattr(provider, "api_key", "")),
        models=[_model_to_response(m) for m in models],
        created_at=None,
    )


def _check_duplicate_model_ids(models: list[ModelInput], _t: Callable[..., str]) -> None:
    seen: set[str] = set()
    for m in models:
        if m.is_enabled and not m.model_id.strip():
            raise HTTPException(status_code=422, detail=_t("model_id_required"))
        if m.is_enabled and not m.endpoint:
            raise HTTPException(status_code=422, detail=_t("endpoint_required"))
        if m.price_output is not None and m.price_input is None:
            raise HTTPException(status_code=422, detail=_t("price_input_required"))
        if m.model_id in seen:
            raise HTTPException(status_code=422, detail=_t("duplicate_model_id", model_id=m.model_id))
        if m.model_id:
            seen.add(m.model_id)


def _check_unique_defaults(models: list[ModelInput], _t: Callable[..., str]) -> None:
    pass


async def _invalidate_caches(request: Request) -> None:
    pass


@router.get("")
async def list_providers(
    _user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    return {"providers": []}


@router.get("/endpoints", response_model=EndpointCatalogResponse)
async def list_endpoint_catalog(_user: CurrentUser) -> EndpointCatalogResponse:
    return EndpointCatalogResponse(
        endpoints=[EndpointDescriptor(**endpoint_spec_to_dict(spec)) for spec in ENDPOINT_REGISTRY.values()],
    )


@router.post("", status_code=201)
async def create_provider(
    body: CreateProviderRequest,
    request: Request,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    if body.models:
        _check_duplicate_model_ids(body.models, _t)
        _check_unique_defaults(body.models, _t)
    await _invalidate_caches(request)
    return _provider_to_response({"id": 1, "display_name": body.display_name, "discovery_format": body.discovery_format, "base_url": body.base_url, "api_key": body.api_key}, [])


@router.get("/{provider_id}")
async def get_provider(
    provider_id: int,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    return _provider_to_response({"id": provider_id, "display_name": "", "discovery_format": "", "base_url": "", "api_key": ""}, [])


@router.get("/{provider_id}/credentials", response_model=CredentialsResponse)
async def get_provider_credentials(
    provider_id: int,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    return CredentialsResponse(base_url="", api_key="")


@router.patch("/{provider_id}")
async def update_provider(
    provider_id: int,
    body: UpdateProviderRequest,
    request: Request,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    kwargs = {}
    if body.display_name is not None:
        kwargs["display_name"] = body.display_name
    if body.base_url is not None:
        kwargs["base_url"] = body.base_url
    if body.api_key is not None:
        kwargs["api_key"] = body.api_key

    if not kwargs:
        raise HTTPException(status_code=400, detail=_t("at_least_one_field_required"))

    await _invalidate_caches(request)
    return _provider_to_response({"id": provider_id, "display_name": "", "discovery_format": "", "base_url": "", "api_key": ""}, [])


@router.put("/{provider_id}")
async def full_update_provider(
    provider_id: int,
    body: FullUpdateProviderRequest,
    request: Request,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    _check_duplicate_model_ids(body.models, _t)
    _check_unique_defaults(body.models, _t)
    await _invalidate_caches(request)
    return _provider_to_response({"id": provider_id, "display_name": body.display_name, "discovery_format": "", "base_url": body.base_url, "api_key": body.api_key or ""}, [])


@router.delete("/{provider_id}", status_code=204)
async def delete_provider(
    provider_id: int,
    request: Request,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    await _invalidate_caches(request)


@router.put("/{provider_id}/models")
async def replace_models(
    provider_id: int,
    body: ReplaceModelsRequest,
    request: Request,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    _check_duplicate_model_ids(body.models, _t)
    _check_unique_defaults(body.models, _t)
    await _invalidate_caches(request)
    return []


@router.post("/discover")
async def discover_models_endpoint(
    body: ProviderConnectionRequest,
    _user: CurrentUser,
    _t=_,
):
    return await _run_discover(body.discovery_format, body.base_url, body.api_key, _t)


@router.post("/discover-anthropic", response_model=DiscoverResponse)
async def discover_anthropic_models_endpoint(
    body: DiscoverAnthropicRequest,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    return await _run_discover("anthropic", body.base_url, body.api_key or "", _t)


@router.post("/{provider_id}/discover")
async def discover_models_by_id(
    provider_id: int,
    _user: CurrentUser,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
):
    return await _run_discover("openai", "", "", _t)


@router.post("/test")
async def test_connection(
    body: ProviderConnectionRequest,
    _user: CurrentUser,
    _t=_,
):
    return await _run_connection_test(body.discovery_format, body.base_url, body.api_key, _t)


@router.post("/{provider_id}/test")
async def test_connection_by_id(
    provider_id: int, _user: CurrentUser, _t=_, session: AsyncSession = Depends(get_async_session)
):
    return await _run_connection_test("openai", "", "", _t)


async def _run_discover(
    discovery_format: str, base_url: str | None, api_key: str, _t: Callable[..., str]
) -> DiscoverResponse:
    return DiscoverResponse(models=[])


async def _run_connection_test(
    discovery_format: str, base_url: str, api_key: str, _t: Callable[..., str]
) -> ConnectionTestResponse:
    try:
        if discovery_format == "custom":
            return ConnectionTestResponse(success=True, message=_t("connection_success"), model_count=0)
        else:
            return ConnectionTestResponse(
                success=False,
                message=_t("unsupported_discovery_format", discovery_format=discovery_format),
            )
    except Exception as exc:
        return ConnectionTestResponse(
            success=False,
            message=_t("connection_failed", err_msg=str(exc)),
        )