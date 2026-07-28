from datetime import datetime

from typing import List, Optional
from pydantic import BaseModel
class Dialogue(BaseModel):
    speaker: str
    line: str
class Scene(BaseModel):
    scene_id: str
    characters_in_scene: List[str] = []
    visual_description: str = ""
    action: str = ""
    dialogue: List[Dialogue] = []
    narration: str = ""
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None
    duration_seconds: Optional[int] = None
class Script(BaseModel):
    project_id: str
    episode_number: int
    title: str
    scenes: List[Scene] = []
    created_at: datetime
    updated_at: datetime
    def get_scene(self, scene_id: str) -> Optional[Scene]:
        return next((s for s in self.scenes if s.scene_id == scene_id), None)
    def add_scene(self, scene: Scene):
        self.scenes.append(scene)
    def update_scene(self, scene_id: str, **updates):
        scene = self.get_scene(scene_id)
        if scene:
            for key, value in updates.items():
                setattr(scene, key, value)
