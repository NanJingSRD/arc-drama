from dataclasses import dataclass
from datetime import datetime

from typing import Optional, Dict
@dataclass
class ProjectEvent:
    event_type: str
    project_id: str
    timestamp: datetime
    user_id: Optional[str] = None
    data: Optional[Dict] = None
class ProjectCreatedEvent(ProjectEvent):
    event_type: str = "project_created"
    name: str = ""
    title: str = ""
class ProjectUpdatedEvent(ProjectEvent):
    event_type: str = "project_updated"
    changes: Optional[Dict] = None
class ProjectDeletedEvent(ProjectEvent):
    event_type: str = "project_deleted"
class ScriptGeneratedEvent(ProjectEvent):
    event_type: str = "script_generated"
    episodes_count: int = 0
class AssetsGeneratedEvent(ProjectEvent):
    event_type: str = "assets_generated"
    characters_count: int = 0
    scenes_count: int = 0
    props_count: int = 0
class StoryboardGeneratedEvent(ProjectEvent):
    event_type: str = "storyboard_generated"
    scene_id: str = ""
    episode_number: int = 0
class VideoGeneratedEvent(ProjectEvent):
    event_type: str = "video_generated"
