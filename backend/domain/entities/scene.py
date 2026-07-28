from datetime import datetime

from typing import Optional
from pydantic import BaseModel
class SceneEntity(BaseModel):
    project_id: str
    name: str
    description: str = ""
    image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    created_at: datetime
    updated_at: datetime
