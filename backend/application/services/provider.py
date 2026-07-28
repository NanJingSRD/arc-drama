from typing import List, Optional

from ai_anidrama.application.dtos.provider import (
    CustomProviderResponse,
    CreateProviderRequest,
    UpdateProviderRequest,
    FullUpdateProviderRequest,
    ReplaceModelsRequest,
    ModelResponse,
    EndpointCatalogResponse,
    EndpointDescriptor,
    DiscoverRequest,
    DiscoverResponse,
)


ENDPOINT_REGISTRY = {
    "openai": {
        "id": "openai",
        "display_name": "OpenAI 兼容",
        "path": "/v1",
        "group": "openai",
        "capabilities": ["text", "image", "video"],
    },
    "google": {
        "id": "google",
        "display_name": "Google 兼容",
        "path": "/v1",
        "group": "google",
        "capabilities": ["text", "image"],
    },
}


class ProviderService:
    async def list_providers(self) -> List[CustomProviderResponse]:
        return []

    async def get_provider(self, provider_id: int) -> Optional[CustomProviderResponse]:
        return None

    async def create_provider(self, body: CreateProviderRequest) -> CustomProviderResponse:
        return CustomProviderResponse(
            id=1,
            display_name=body.display_name,
            discovery_format=body.discovery_format,
            base_url=body.base_url,
            models=[],
            created_at="",
            updated_at="",
        )

    async def update_provider(
        self, provider_id: int, body: UpdateProviderRequest
    ) -> Optional[CustomProviderResponse]:
        return None

    async def full_update_provider(
        self, provider_id: int, body: FullUpdateProviderRequest
    ) -> Optional[CustomProviderResponse]:
        return None

    async def delete_provider(self, provider_id: int) -> bool:
        return False

    async def replace_models(self, provider_id: int, body: ReplaceModelsRequest) -> List[ModelResponse]:
        return []

    async def get_endpoint_catalog(self) -> EndpointCatalogResponse:
        endpoints = [EndpointDescriptor(**spec) for spec in ENDPOINT_REGISTRY.values()]
        return EndpointCatalogResponse(endpoints=endpoints)

    async def discover_models(self, body: DiscoverRequest) -> DiscoverResponse:
        return DiscoverResponse(
            success=True,
            message="模型发现成功",
            models=[],
        )