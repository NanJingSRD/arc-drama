from datetime import datetime

from typing import Optional
from pydantic import BaseModel
class ApiKey(BaseModel):
    id: int
    name: str
    key_hash: str
    key_prefix: str
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
