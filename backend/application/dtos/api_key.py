from typing import Optional
from pydantic import BaseModel, Field
class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., description="API密钥名称")
    expires_days: Optional[int] = Field(None, ge=0, description="过期天数，0表示不过期，默认30天")
class UpdateApiKeyRequest(BaseModel):
    name: Optional[str] = Field(None, description="API密钥名称")
    expires_days: Optional[int] = Field(None, ge=0, description="过期天数，0表示不过期")
class ApiKeyResponse(BaseModel):
    id: int
    name: str
    key: Optional[str] = None
    key_prefix: str
    created_at: str
    expires_at: Optional[str] = None
    last_used_at: Optional[str] = None
