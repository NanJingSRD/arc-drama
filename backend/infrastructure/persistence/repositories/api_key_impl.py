import json
import os
from datetime import datetime
from typing import List, Optional

from ai_anidrama.domain.entities.api_key import ApiKey
from ai_anidrama.domain.repositories.api_key import ApiKeyRepository


class ApiKeyRepositoryImpl(ApiKeyRepository):
    def __init__(self, storage_path: str = "api_keys.json"):
        self.storage_path = storage_path
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump({"keys": [], "next_id": 1}, f, ensure_ascii=False, indent=2)

    def _load(self) -> dict:
        with open(self.storage_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def _parse_datetime(self, value: Optional[str]) -> Optional[datetime]:
        if value:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return None

    def _to_entity(self, data: dict) -> ApiKey:
        return ApiKey(
            id=data["id"],
            name=data["name"],
            key_hash=data["key_hash"],
            key_prefix=data["key_prefix"],
            expires_at=self._parse_datetime(data.get("expires_at")),
            last_used_at=self._parse_datetime(data.get("last_used_at")),
            created_at=self._parse_datetime(data["created_at"]),
            updated_at=self._parse_datetime(data["updated_at"]),
        )

    async def create(
        self,
        name: str,
        key_hash: str,
        key_prefix: str,
        expires_at: Optional[datetime] = None,
    ) -> ApiKey:
        data = self._load()
        for key in data["keys"]:
            if key["name"] == name:
                raise ValueError(f"API Key with name '{name}' already exists")

        now = datetime.now()
        key_data = {
            "id": data["next_id"],
            "name": name,
            "key_hash": key_hash,
            "key_prefix": key_prefix,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "last_used_at": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        data["keys"].append(key_data)
        data["next_id"] += 1
        self._save(data)

        return self._to_entity(key_data)

    async def list_all(self) -> List[ApiKey]:
        data = self._load()
        return [self._to_entity(key) for key in data["keys"]]

    async def get_by_id(self, key_id: int) -> Optional[ApiKey]:
        data = self._load()
        for key in data["keys"]:
            if key["id"] == key_id:
                return self._to_entity(key)
        return None

    async def get_by_hash(self, key_hash: str) -> Optional[ApiKey]:
        data = self._load()
        for key in data["keys"]:
            if key["key_hash"] == key_hash:
                return self._to_entity(key)
        return None

    async def update(
        self,
        key_id: int,
        name: Optional[str] = None,
        expires_at: Optional[datetime] = None,
    ) -> Optional[ApiKey]:
        data = self._load()
        for key in data["keys"]:
            if key["id"] == key_id:
                if name is not None:
                    for existing_key in data["keys"]:
                        if existing_key["name"] == name and existing_key["id"] != key_id:
                            raise ValueError(f"API Key with name '{name}' already exists")
                    key["name"] = name

                if expires_at is not None:
                    key["expires_at"] = expires_at.isoformat()

                key["updated_at"] = datetime.now().isoformat()
                self._save(data)
                return self._to_entity(key)

        return None

    async def delete(self, key_id: int) -> bool:
        data = self._load()
        original_count = len(data["keys"])
        data["keys"] = [key for key in data["keys"] if key["id"] != key_id]

        if len(data["keys"]) != original_count:
            self._save(data)
            return True

        return False

    async def force_delete(self, key_id: int) -> bool:
        return await self.delete(key_id)

    async def update_last_used(self, key_hash: str) -> None:
        data = self._load()
        for key in data["keys"]:
            if key["key_hash"] == key_hash:
                key["last_used_at"] = datetime.now().isoformat()
                key["updated_at"] = datetime.now().isoformat()
                self._save(data)
                break