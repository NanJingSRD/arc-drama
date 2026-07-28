from datetime import datetime
from typing import List, Optional, Protocol

from ai_anidrama.domain.entities.api_key import ApiKey


class ApiKeyRepository(Protocol):
    async def create(
        self,
        name: str,
        key_hash: str,
        key_prefix: str,
        expires_at: Optional[datetime] = None,
    ) -> ApiKey:
        ...

    async def list_all(self) -> List[ApiKey]:
        ...

    async def get_by_id(self, key_id: int) -> Optional[ApiKey]:
        ...

    async def get_by_hash(self, key_hash: str) -> Optional[ApiKey]:
        ...

    async def update(
        self,
        key_id: int,
        name: Optional[str] = None,
    ) -> Optional[ApiKey]:
        ...

    async def delete(self, key_id: int) -> bool:
        ...

    async def update_last_used(self, key_hash: str) -> None:
        ...