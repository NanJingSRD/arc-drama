from datetime import datetime

from typing import Dict, Optional
from pydantic import BaseModel
class Task(BaseModel):
    task_id: str
    project_id: str
    task_type: str
    media_type: str
    resource_id: str
    status: str = "pending"
    progress: float = 0.0
    message: str = ""
    payload: Dict = {}
    result: Optional[Dict] = None
    error: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    def set_status(self, status: str, progress: float = 0.0, message: str = ""):
        self.status = status
        self.progress = progress
        self.message = message
        self.updated_at = datetime.now()
    def set_result(self, result: Dict):
        self.result = result
        self.status = "completed"
        self.progress = 1.0
    def set_error(self, error: str):
        self.error = error
        self.status = "failed"
