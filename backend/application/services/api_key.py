import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from ai_anidrama.domain.entities.api_key import ApiKey
from ai_anidrama.domain.repositories.api_key import ApiKeyRepository

API_KEY_PREFIX = "arc-"
API_KEY_DEFAULT_EXPIRY_DAYS = 30


def _generate_api_key() -> str:
    random_part = secrets.token_hex(16)
    return f"{API_KEY_PREFIX}{random_part}"


def _hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def _default_expires_at() -> datetime:
    return datetime.now() + timedelta(days=API_KEY_DEFAULT_EXPIRY_DAYS)


class ApiKeyService:
    def __init__(self, api_key_repo: ApiKeyRepository):
        self.api_key_repo = api_key_repo

    async def create_api_key(self, name: str, expires_days: Optional[int] = None) -> dict:
        key = _generate_api_key()
        key_hash = _hash_api_key(key)
        key_prefix = key[:8]

        if expires_days == 0:
            expires_at: Optional[datetime] = None
        elif expires_days is not None:
            expires_at = datetime.now() + timedelta(days=expires_days)
        else:
            expires_at = _default_expires_at()

        api_key = await self.api_key_repo.create(
            name=name,
            key_hash=key_hash,
            key_prefix=key_prefix,
            expires_at=expires_at,
        )

        return {
            "id": api_key.id,
            "name": api_key.name,
            "key": key,
            "key_prefix": api_key.key_prefix,
            "created_at": api_key.created_at.isoformat(),
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
        }

    async def list_api_keys(self) -> List[dict]:
        keys = await self.api_key_repo.list_all()
        return [self._to_dict(key) for key in keys]

    async def get_api_key(self, key_id: int) -> Optional[dict]:
        key = await self.api_key_repo.get_by_id(key_id)
        if key:
            return self._to_dict(key)
        return None

    async def update_api_key(
        self,
        key_id: int,
        name: Optional[str] = None,
        expires_days: Optional[int] = None,
    ) -> Optional[dict]:
        if expires_days == 0:
            expires_at = None
        elif expires_days is not None:
            expires_at = datetime.now() + timedelta(days=expires_days)
        else:
            expires_at = None

        updated_key = await self.api_key_repo.update(
            key_id=key_id,
            name=name,
            expires_at=expires_at,
        )

        if updated_key:
            return self._to_dict(updated_key)
        return None

    async def delete_api_key(self, key_id: int) -> bool:
        return await self.api_key_repo.delete(key_id)

    async def force_delete_api_key(self, key_id: int) -> bool:
        return await self.api_key_repo.force_delete(key_id)

    def _to_dict(self, api_key: ApiKey) -> dict:
        return {
            "id": api_key.id,
            "name": api_key.name,
            "key_prefix": api_key.key_prefix,
            "created_at": api_key.created_at.isoformat(),
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            "last_used_at": api_key.last_used_at.isoformat() if api_key.last_used_at else None,
        }