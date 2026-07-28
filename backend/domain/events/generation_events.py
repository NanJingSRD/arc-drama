from dataclasses import dataclass
from datetime import datetime

from typing import Optional, Dict
@dataclass
class GenerationEvent:
    event_type: str
    task_id: str
    project_id: str
    timestamp: datetime
    user_id: Optional[str] = None
class TaskQueuedEvent(GenerationEvent):
    event_type: str = "task_queued"
    task_type: str = ""
    resource_id: str = ""
class TaskStartedEvent(GenerationEvent):
    event_type: str = "task_started"
class TaskProgressEvent(GenerationEvent):
    event_type: str = "task_progress"
    progress: float = 0.0
    message: str = ""
class TaskCompletedEvent(GenerationEvent):
    event_type: str = "task_completed"
    result: Optional[Dict] = None
class TaskFailedEvent(GenerationEvent):
    event_type: str = "task_failed"
    error: str = ""
class GenerationCostEvent(GenerationEvent):
    event_type: str = "generation_cost"
    cost: float = 0.0
    provider: str = ""
    model: str = ""
