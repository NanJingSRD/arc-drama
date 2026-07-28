from datetime import datetime

from typing import Any, Dict, List, Optional
from pydantic import BaseModel
class Project(BaseModel):
    project_id: str
    name: str
    title: str
    style: str = ""
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    content_mode: str = "narration"
    source_kind: Optional[str] = None
    episode_rewrite_mode: Optional[str] = None
    style_template_id: Optional[str] = None
    aspect_ratio: Optional[str] = "9:16"
    default_duration: Optional[int] = None
    generation_mode: str = "storyboard"
    video_backend: Optional[str] = None
    image_provider_t2i: Optional[str] = None
    image_provider_i2i: Optional[str] = None
    text_backend_script: Optional[str] = None
    text_backend_overview: Optional[str] = None
    model_settings: Optional[Dict[str, Any]] = None
    characters: Dict[str, Dict] = {}
    scenes: Dict[str, Dict] = {}
    props: Dict[str, Dict] = {}
    overview: Optional[Dict] = None
    episodes: List[Dict] = []
    status: str = "draft"
    progress: float = 0.0
    created_at: datetime
    updated_at: datetime
    def add_episode(self, episode_number: int, title: str, script_file: str):
        existing = next((e for e in self.episodes if e.get("episode") == episode_number), None)
        if existing:
            existing["script_file"] = script_file
            existing["title"] = title
        else:
            self.episodes.append({
                "episode": episode_number,
                "title": title,
                "script_file": script_file,
                "status": "draft",
            })
    def add_character(self, name: str, description: str, voice_style: str = "", image_url: str = None, image_prompt: str = None):
        if name not in self.characters:
            self.characters[name] = {
                "description": description,
                "voice_style": voice_style,
                "image_url": image_url,
                "image_prompt": image_prompt,
            }
    def update_character(self, name: str, **kwargs):
        if name in self.characters:
            for key, value in kwargs.items():
                if value is not None:
                    self.characters[name][key] = value
    def delete_character(self, name: str):
        if name in self.characters:
            del self.characters[name]

    def add_scene(self, name: str, description: str, image_url: str = None, image_prompt: str = None):
        if name not in self.scenes:
            self.scenes[name] = {"description": description, "image_url": image_url, "image_prompt": image_prompt}

    def update_scene(self, name: str, **kwargs):
        if name in self.scenes:
            for key, value in kwargs.items():
                if value is not None:
                    self.scenes[name][key] = value

    def delete_scene(self, name: str):
        if name in self.scenes:
            del self.scenes[name]

    def add_prop(self, name: str, description: str, image_url: str = None, image_prompt: str = None):
        if name not in self.props:
            self.props[name] = {"description": description, "image_url": image_url, "image_prompt": image_prompt}

    def update_prop(self, name: str, **kwargs):
        if name in self.props:
            for key, value in kwargs.items():
                if value is not None:
                    self.props[name][key] = value

    def delete_prop(self, name: str):
        if name in self.props:
            del self.props[name]
    def update_progress(self):
        total_scenes = 0
        completed_scenes = 0
        for episode in self.episodes:
            if episode.get("scenes"):
                total_scenes += len(episode["scenes"])
                for scene in episode["scenes"]:
                    if scene.get("video_status") == "completed":
                        completed_scenes += 1
        if total_scenes > 0:
            self.progress = completed_scenes / total_scenes
        else:
            self.progress = 0.0

        if self.progress == 0.0:
            self.status = "draft"
        elif self.progress < 1.0:
            self.status = "generating"
        else:
            self.status = "completed"
