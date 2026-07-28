from pydantic import BaseModel
from typing import List, Optional
class UploadRequest(BaseModel):
    project_id: str
    segment_id: str
class BatchUploadRequest(BaseModel):
    segment_ids: List[str]
class UploadResponse(BaseModel):
    code: int
    message: str
    data: dict
class BatchUploadResponse(BaseModel):
    data: List[dict]
    success_count: int
    failed_count: int
