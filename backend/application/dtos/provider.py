from typing import Optional, List

from pydantic import BaseModel, Field


class ModelResponse(BaseModel):
    model_id: str
    display_name: str
    is_default: bool
    capabilities: List[str] = []


class CustomProviderResponse(BaseModel):
    id: int
    display_name: str
    discovery_format: str
    base_url: str
    models: List[ModelResponse] = []
    created_at: str
    updated_at: str


class ProviderModel(BaseModel):
    model_id: str
    display_name: str
    is_default: bool = False


class CreateProviderRequest(BaseModel):
    display_name: str
    discovery_format: str
    base_url: str
    api_key: str
    models: Optional[List[ProviderModel]] = None


class UpdateProviderRequest(BaseModel):
    display_name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None


class FullUpdateProviderRequest(BaseModel):
    display_name: str
    discovery_format: str
    base_url: str
    models: List[ProviderModel] = []


class ReplaceModelsRequest(BaseModel):
    models: List[ProviderModel] = []


class EndpointDescriptor(BaseModel):
    id: str
    display_name: str
    path: str
    group: str
    capabilities: List[str] = []


class EndpointCatalogResponse(BaseModel):
    endpoints: List[EndpointDescriptor] = []


class DiscoverRequest(BaseModel):
    base_url: str
    api_key: Optional[str] = None
    discovery_format: str = "openai"


class DiscoverResponse(BaseModel):
    success: bool
    message: str = ""
    models: List[ModelResponse] = []