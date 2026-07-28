from datetime import datetime

from typing import Optional
from pydantic import BaseModel
class Character(BaseModel):
    project_id: str
    name: str
    description: str = ""
    voice_style: str = ""
    image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    created_at: datetime
    updated_at: datetime
