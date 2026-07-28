from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class StoryboardGenerateRequest(BaseModel):
    episode_number: int = Field(..., description="剧集编号")
    scene_id: str = Field(..., description="场景ID")
    prompt: Optional[str] = Field(None, description="自定义提示词")


class StoryboardGenerateResponse(BaseModel):
    success: bool
    message: str
    task_id: str


class VideoGenerateRequest(BaseModel):
    episode_number: int = Field(..., description="剧集编号")
    scene_id: str = Field(..., description="场景ID")
    prompt: Optional[str] = Field(None, description="自定义提示词")


class VideoGenerateResponse(BaseModel):
    success: bool
    message: str
    task_id: str


class TaskResponse(BaseModel):
    task_id: str
    project_id: str
    project_name: Optional[str] = None  # 前端字段名
    task_type: str
    media_type: str
    resource_id: str
    script_file: Optional[str] = None  # 前端字段，从payload提取
    status: str
    progress: float
    message: str = ""
    payload: dict = {}
    result: Optional[dict] = None
    error: Optional[str] = None
    error_message: Optional[str] = None  # 前端字段名
    cancelled_by: Optional[str] = None  # 前端字段
    provider_id: Optional[str] = None  # 前端字段
    provider_job_id: Optional[str] = None  # 前端字段
    source: Optional[str] = None  # 前端字段
    queued_at: Optional[str] = None  # 前端字段
    started_at: Optional[str] = None  # 前端字段
    finished_at: Optional[str] = None  # 前端字段
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int


class BatchStoryboardRequest(BaseModel):
    episode_number: int = Field(..., description="剧集编号")
    scene_ids: List[str] = Field(..., description="场景ID列表")


class BatchStoryboardResponse(BaseModel):
    success: bool
    message: str
    task_ids: List[str] = []


class BatchVideoRequest(BaseModel):
    episode_number: int = Field(..., description="剧集编号")
    scene_ids: List[str] = Field(..., description="场景ID列表")


class BatchVideoResponse(BaseModel):
    success: bool
    message: str
    task_ids: List[str] = []


class RegenerateStoryboardRequest(BaseModel):
    episode_number: int = Field(..., description="剧集编号")
    scene_id: str = Field(..., description="场景ID")
    prompt: Optional[str] = Field(None, description="自定义提示词")


class RegenerateStoryboardResponse(BaseModel):
    success: bool
    message: str
    task_id: str


class RegenerateVideoRequest(BaseModel):
    episode_number: int = Field(..., description="剧集编号")
    scene_id: str = Field(..., description="场景ID")
    prompt: Optional[str] = Field(None, description="自定义提示词")


class RegenerateVideoResponse(BaseModel):
    success: bool
    message: str
    task_id: str