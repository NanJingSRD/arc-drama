from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AssetResponse(BaseModel):
    name: str
    description: str = ""
    image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CharacterResponse(AssetResponse):
    voice_style: str = ""


class CharacterListResponse(BaseModel):
    characters: List[CharacterResponse]
    total: int


class SceneResponse(AssetResponse):
    pass


class SceneListResponse(BaseModel):
    scenes: List[SceneResponse]
    total: int


class PropResponse(AssetResponse):
    pass


class PropListResponse(BaseModel):
    props: List[PropResponse]
    total: int


class AssetGenerateRequest(BaseModel):
    asset_type: str = Field(..., description="资产类型: character | scene | prop | all")


class AssetGenerateResponse(BaseModel):
    success: bool
    message: str
    task_id: str


class AssetDesignRequest(BaseModel):
    name: str = Field(..., description="资产名称")
    prompt: Optional[str] = Field(None, description="生成提示词")


class AssetDesignResponse(BaseModel):
    success: bool
    message: str
    task_id: Optional[str] = None
    image_url: Optional[str] = None


class CharacterCreateRequest(BaseModel):
    name: str = Field(..., description="角色名称")
    description: str = Field("", description="角色描述")
    voice_style: str = Field("", description="配音风格")
    image_url: Optional[str] = Field(None, description="角色图片URL")
    image_prompt: Optional[str] = Field(None, description="图片生成提示词")


class CharacterUpdateRequest(BaseModel):
    description: Optional[str] = Field(None, description="角色描述")
    voice_style: Optional[str] = Field(None, description="配音风格")


class SceneCreateRequest(BaseModel):
    name: str = Field(..., description="场景名称")
    description: str = Field("", description="场景描述")
    image_url: Optional[str] = Field(None, description="场景图片URL")


class SceneUpdateRequest(BaseModel):
    description: Optional[str] = Field(None, description="场景描述")


class PropCreateRequest(BaseModel):
    name: str = Field(..., description="道具名称")
    description: str = Field("", description="道具描述")
    image_url: Optional[str] = Field(None, description="道具图片URL")


class PropUpdateRequest(BaseModel):
    description: Optional[str] = Field(None, description="道具描述")


class AssetOperationResponse(BaseModel):
    success: bool
    message: str