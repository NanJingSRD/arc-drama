from datetime import datetime

from typing import List, Optional
from pydantic import BaseModel, Field
class DialogueDTO(BaseModel):
    speaker: str
    line: str
class SceneDTO(BaseModel):
    scene_id: str
    characters_in_scene: List[str] = []
    visual_description: str = ""
    action: str = ""
    dialogue: List[DialogueDTO] = []
    narration: str = ""
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None
    duration_seconds: Optional[int] = None
class ScriptResponse(BaseModel):
    project_id: str
    episode: int
    title: str
    scenes: List[SceneDTO] = []
    created_at: datetime
    updated_at: datetime
class ScriptListResponse(BaseModel):
    scripts: List[ScriptResponse]
    total: int
class ScriptProcessRequest(BaseModel):
    episodes_count: int = Field(default=0, description="期望分集数")
class ScriptProcessResponse(BaseModel):
    success: bool
    message: str
    task_id: str
