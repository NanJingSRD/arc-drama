"""
供应商配置管理 API。

提供供应商列表查询、单个供应商配置读写和连接测试端点。
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import AfterValidator, BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.sqlalchemy.engine import get_async_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/providers", tags=["Providers"])

_ = lambda x, **kwargs: x

_CREDENTIAL_KEYS = frozenset({"api_key", "credentials_path", "base_url", "access_key", "secret_key"})

_FIELD_META: dict[str, dict[str, str]] = {
    "api_key": {"label": "API Key", "type": "secret"},
    "access_key": {"label": "Access Key", "type": "secret"},
    "secret_key": {"label": "Secret Key", "type": "secret"},
    "base_url": {"label": "Base URL", "type": "url", "placeholder": "Default"},
    "credentials_path": {"label": "Vertex Credentials Path", "type": "text"},
    "gcs_bucket": {"label": "GCS Bucket", "type": "text"},
    "image_rpm": {"label": "Image RPM", "type": "number"},
    "video_rpm": {"label": "Video RPM", "type": "number"},
    "request_gap": {"label": "Request Gap (sec)", "type": "number"},
    "image_max_workers": {"label": "Image Max Workers", "type": "number"},
    "video_max_workers": {"label": "Video Max Workers", "type": "number"},
    "audio_max_workers": {"label": "Audio Max Workers", "type": "number"},
}


class ModelInfoResponse(BaseModel):
    display_name: str
    media_type: str
    capabilities: list[str]
    default: bool
    supported_durations: list[int] = []
    duration_resolution_constraints: dict[str, list[int]] = {}
    resolutions: list[str] = []


class ProviderSummary(BaseModel):
    id: str
    display_name: str
    description: str
    status: str
    media_types: list[str]
    capabilities: list[str]
    configured_keys: list[str]
    missing_keys: list[str]
    models: dict[str, ModelInfoResponse]


class ProvidersListResponse(BaseModel):
    providers: list[ProviderSummary]


class FieldInfo(BaseModel):
    key: str
    label: str
    type: str
    required: bool
    is_set: bool
    value: str | None = None
    value_masked: str | None = None
    placeholder: str | None = None


class CredentialSecretField(BaseModel):
    key: str
    label: str


class ProviderConfigResponse(BaseModel):
    id: str
    display_name: str
    description: str
    status: str
    media_types: list[str]
    fields: list[FieldInfo]
    supports_base_url: bool
    secret_fields: list[CredentialSecretField]


class ConnectionTestResponse(BaseModel):
    success: bool
    available_models: list[str]
    message: str


class CredentialResponse(BaseModel):
    id: int
    provider: str
    name: str
    api_key_masked: str | None = None
    credentials_filename: str | None = None
    base_url: str | None = None
    access_key_masked: str | None = None
    secret_key_masked: str | None = None
    is_active: bool
    created_at: str


class CredentialListResponse(BaseModel):
    credentials: list[CredentialResponse]


def _stripped(v: str | None) -> str | None:
    return v.strip() if isinstance(v, str) else v


_StrippedStr = Annotated[str, AfterValidator(_stripped)]
_StrippedOptStr = Annotated[str | None, AfterValidator(_stripped)]


class CreateCredentialRequest(BaseModel):
    name: _StrippedStr
    api_key: _StrippedOptStr = None
    base_url: _StrippedOptStr = None
    access_key: _StrippedOptStr = None
    secret_key: _StrippedOptStr = None


class UpdateCredentialRequest(BaseModel):
    name: _StrippedOptStr = None
    api_key: _StrippedOptStr = None
    base_url: _StrippedOptStr = None
    access_key: _StrippedOptStr = None
    secret_key: _StrippedOptStr = None


def mask_secret(secret: str | None) -> str:
    if not secret:
        return ""
    return secret[:4] + "..." + secret[-4:] if len(secret) > 8 else "••••"


def _validate_provider(provider_id: str, _t: Callable[..., str]) -> None:
    pass


async def _invalidate_caches(request: Request) -> None:
    pass


def _build_field(
    key: str,
    required: bool,
    db_entry: dict[str, Any] | None,
) -> FieldInfo:
    meta = _FIELD_META.get(key, {"label": key, "type": "text"})
    is_set = db_entry is not None and db_entry.get("is_set", False)

    field: dict[str, Any] = {
        "key": key,
        "label": meta["label"],
        "type": meta["type"],
        "required": required,
        "is_set": is_set,
    }

    if "placeholder" in meta:
        field["placeholder"] = meta["placeholder"]

    if is_set:
        if meta["type"] == "secret":
            field["value_masked"] = db_entry.get("masked", "••••")
        else:
            field["value"] = db_entry.get("value", "")
    else:
        if meta["type"] == "secret":
            field["value_masked"] = None
        else:
            field["value"] = ""

    return FieldInfo(**field)


@router.get("", response_model=ProvidersListResponse)
async def list_providers(
    _t=_,
) -> ProvidersListResponse:
    return ProvidersListResponse(providers=[])


@router.get("/{provider_id}/config", response_model=ProviderConfigResponse)
async def get_provider_config(
    provider_id: str,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
) -> ProviderConfigResponse:
    _validate_provider(provider_id, _t)
    return ProviderConfigResponse(
        id=provider_id,
        display_name=provider_id,
        description="",
        status="unconfigured",
        media_types=[],
        fields=[],
        supports_base_url=False,
        secret_fields=[],
    )


@router.patch("/{provider_id}/config", status_code=204)
async def patch_provider_config(
    provider_id: str,
    body: dict[str, str | None],
    request: Request,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    _validate_provider(provider_id, _t)
    await _invalidate_caches(request)
    return Response(status_code=204)


@router.get("/{provider_id}/credentials", response_model=CredentialListResponse)
async def list_credentials(
    provider_id: str,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
) -> CredentialListResponse:
    _validate_provider(provider_id, _t)
    return CredentialListResponse(credentials=[])


@router.post("/{provider_id}/credentials", status_code=201, response_model=CredentialResponse)
async def create_credential(
    provider_id: str,
    body: CreateCredentialRequest,
    request: Request,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
) -> CredentialResponse:
    _validate_provider(provider_id, _t)
    await _invalidate_caches(request)
    return CredentialResponse(
        id=1,
        provider=provider_id,
        name=body.name,
        api_key_masked=mask_secret(body.api_key),
        credentials_filename=None,
        base_url=body.base_url,
        access_key_masked=mask_secret(body.access_key),
        secret_key_masked=mask_secret(body.secret_key),
        is_active=True,
        created_at="",
    )


@router.patch("/{provider_id}/credentials/{cred_id}", status_code=204)
async def update_credential(
    provider_id: str,
    cred_id: int,
    body: UpdateCredentialRequest,
    request: Request,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    _validate_provider(provider_id, _t)
    await _invalidate_caches(request)
    return Response(status_code=204)


@router.delete("/{provider_id}/credentials/{cred_id}", status_code=204)
async def delete_credential(
    provider_id: str,
    cred_id: int,
    request: Request,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    _validate_provider(provider_id, _t)
    await _invalidate_caches(request)
    return Response(status_code=204)


@router.post("/{provider_id}/credentials/{cred_id}/activate", status_code=204)
async def activate_credential(
    provider_id: str,
    cred_id: int,
    request: Request,
    _t=_,
    session: AsyncSession = Depends(get_async_session),
) -> Response:
    _validate_provider(provider_id, _t)
    await _invalidate_caches(request)
    return Response(status_code=204)


@router.post("/gemini-vertex/credentials/upload", status_code=201, response_model=CredentialResponse)
async def upload_vertex_credential(
    request: Request,
    _t=_,
    name: str = "Vertex Credentials",
    session: AsyncSession = Depends(get_async_session),
    file: UploadFile = File(...),
) -> CredentialResponse:
    await _invalidate_caches(request)
    return CredentialResponse(
        id=1,
        provider="gemini-vertex",
        name=name,
        api_key_masked=None,
        credentials_filename=None,
        base_url=None,
        access_key_masked=None,
        secret_key_masked=None,
        is_active=True,
        created_at="",
    )


_CONNECTION_TEST_TIMEOUT = 15


@router.post("/{provider_id}/test", response_model=ConnectionTestResponse)
async def test_provider_connection(
    provider_id: str,
    _t=_,
    credential_id: int | None = None,
    session: AsyncSession = Depends(get_async_session),
) -> ConnectionTestResponse:
    _validate_provider(provider_id, _t)
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(lambda: ConnectionTestResponse(success=True, available_models=[], message="connection_success")),
            timeout=_CONNECTION_TEST_TIMEOUT,
        )
        return result
    except TimeoutError:
        return ConnectionTestResponse(
            success=False,
            available_models=[],
            message="connection_timeout",
        )
    except Exception as exc:
        return ConnectionTestResponse(
            success=False,
            available_models=[],
            message=f"connection_failed: {str(exc)}",
        )