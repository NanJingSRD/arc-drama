from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ExportVideoRequest(BaseModel):
    episode_number: int = Field(..., description="剧集编号")
    scene_ids: Optional[List[str]] = Field(None, description="场景ID列表，为空则导出整集")


class ExportVideoResponse(BaseModel):
    success: bool
    message: str
    download_url: Optional[str] = None
    file_path: Optional[str] = None


class ExportProjectRequest(BaseModel):
    include_videos: bool = Field(True, description="是否包含视频")
    include_storyboards: bool = Field(False, description="是否包含分镜图")
    include_assets: bool = Field(False, description="是否包含资产文件")


class ExportProjectResponse(BaseModel):
    success: bool
    message: str
    file_path: Optional[str] = None
    exported_files: List[str] = []


class ExportJianyingRequest(BaseModel):
    episode_number: int = Field(..., description="剧集编号")


class ExportJianyingResponse(BaseModel):
    success: bool
    message: str
    draft_path: Optional[str] = None


class ExportListResponse(BaseModel):
    exports: List[dict] = []
    total: int = 0