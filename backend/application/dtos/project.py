from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    """创建项目请求 - 与前端 WorkspaceV2CreateProjectPayload 一致"""
    name: Optional[str] = Field(None, description="项目ID（自动生成或手动指定）")
    title: str = Field(..., description="项目标题")
    content_mode: Optional[str] = Field("narration", description="内容模式：drama/narration/ad")
    source_kind: Optional[str] = Field(None, description="源文件性质：novel/screenplay")
    episode_rewrite_mode: Optional[str] = Field(None, description="剧集模式：ai_rewrite/original")
    style: Optional[str] = Field("", description="风格描述")
    style_template_id: Optional[str] = Field(None, description="风格模板ID")
    aspect_ratio: Optional[str] = Field("9:16", description="画面比例")
    default_duration: Optional[int] = Field(None, description="默认时长（秒）")
    generation_mode: Optional[str] = Field("storyboard", description="生成模式：storyboard/grid/reference_video")
    video_backend: Optional[str] = Field(None, description="视频生成后端")
    image_provider_t2i: Optional[str] = Field(None, description="图生图提供者")
    image_provider_i2i: Optional[str] = Field(None, description="图生图i2i提供者")
    text_backend_script: Optional[str] = Field(None, description="剧本生成文本后端")
    text_backend_overview: Optional[str] = Field(None, description="概述生成文本后端")
    model_settings: Optional[Dict[str, Any]] = Field(None, description="模型分辨率设置")


class ProjectUpdateRequest(BaseModel):
    """更新项目请求 - 与前端 WorkspaceV2UpdateProjectPayload 一致"""
    title: Optional[str] = Field(None, description="项目标题")
    style: Optional[str] = Field(None, description="风格描述")
    content_mode: Optional[str] = Field(None, description="内容模式")
    source_kind: Optional[str] = Field(None, description="源文件性质")
    episode_rewrite_mode: Optional[str] = Field(None, description="剧集模式")
    style_template_id: Optional[str] = Field(None, description="风格模板ID")
    aspect_ratio: Optional[str] = Field(None, description="画面比例")
    default_duration: Optional[int] = Field(None, description="默认时长（秒）")
    generation_mode: Optional[str] = Field(None, description="生成模式")
    video_backend: Optional[str] = Field(None, description="视频生成后端")
    image_provider_t2i: Optional[str] = Field(None, description="图生图提供者")
    image_provider_i2i: Optional[str] = Field(None, description="图生图i2i提供者")
    text_backend_script: Optional[str] = Field(None, description="剧本生成文本后端")
    model_settings: Optional[Dict[str, Any]] = Field(None, description="模型分辨率设置")


class ProjectResponse(BaseModel):
    """项目响应 - 与前端 WorkspaceV2ApiProjectSummary / ProjectData 一致"""
    project_id: str
    name: str
    title: str
    style: str
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    content_mode: str
    content_mode_label: Optional[str] = None
    source_kind: Optional[str] = None
    episode_rewrite_mode: Optional[str] = None
    style_template_id: Optional[str] = None
    aspect_ratio: Optional[str] = None
    default_duration: Optional[int] = None
    generation_mode: str
    video_backend: Optional[str] = None
    image_provider_t2i: Optional[str] = None
    image_provider_i2i: Optional[str] = None
    text_backend_script: Optional[str] = None
    text_backend_overview: Optional[str] = None
    model_settings: Optional[Dict[str, Any]] = None
    overview: Optional[dict] = None
    status: Optional[dict] = None
    progress: float
    episodes_count: int
    characters_count: int
    scenes_count: int
    props_count: int
    current_phase_label: Optional[str] = None
    metadata: Optional[dict] = None
    episodes: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime
    characters: Optional[dict] = None
    scenes: Optional[dict] = None
    props: Optional[dict] = None


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int