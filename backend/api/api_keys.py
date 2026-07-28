"""
API Key 管理路由
"""

import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.sqlalchemy.engine import get_session_maker
from ai_anidrama.infrastructure.persistence.sqlalchemy.models import ApiKeyModel

router = APIRouter()

API_KEY_PREFIX = "arc-"


def _hash_api_key(key: str) -> str:
    import hashlib

    return hashlib.sha256(key.encode()).hexdigest()


def _generate_api_key() -> str:
    random_part = secrets.token_hex(16)
    return f"{API_KEY_PREFIX}{random_part}"


class CreateApiKeyRequest:
    def __init__(self, name: str, expires_days: int | None = None):
        self.name = name
        self.expires_days = expires_days


class ApiKeyInfo:
    def __init__(self, id: int, name: str, key_prefix: str, created_at: str, expires_at: str | None, last_used_at: str | None = None):
        self.id = id
        self.name = name
        self.key_prefix = key_prefix
        self.created_at = created_at
        self.expires_at = expires_at
        self.last_used_at = last_used_at


@router.post("/api-keys", status_code=201)
async def create_api_key(
    body: dict,
    _user: CurrentUser,
):
    _t = lambda x, **kwargs: x

    name = body.get("name", "")
    expires_days = body.get("expires_days")

    if not name:
        raise HTTPException(status_code=400, detail="name_required")

    key = _generate_api_key()
    key_hash = _hash_api_key(key)
    key_prefix = key[:8]

    if expires_days == 0:
        expires_at = None
    elif expires_days is not None:
        expires_at = datetime.now(UTC) + timedelta(days=expires_days)
    else:
        expires_at = datetime.now(UTC) + timedelta(days=30)

    async with get_session_maker()() as session:
        async with session.begin():
            api_key = ApiKeyModel(
                name=name,
                key_hash=key_hash,
                key_prefix=key_prefix,
                expires_at=expires_at,
            )
            session.add(api_key)
            await session.flush()
            await session.refresh(api_key)

    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": key,
        "key_prefix": api_key.key_prefix,
        "created_at": api_key.created_at.isoformat() if api_key.created_at else "",
        "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
    }


@router.get("/api-keys")
async def list_api_keys(
    _user: CurrentUser,
):
    async with get_session_maker()() as session:
        async with session.begin():
            keys = await session.execute(
                """SELECT id, name, key_prefix, created_at, expires_at, last_used_at FROM api_keys ORDER BY created_at DESC"""
            )
            rows = keys.fetchall()

    return [
        {
            "id": row[0],
            "name": row[1],
            "key_prefix": row[2],
            "created_at": row[3].isoformat() if row[3] else "",
            "expires_at": row[4].isoformat() if row[4] else None,
            "last_used_at": row[5].isoformat() if row[5] else None,
        }
        for row in rows
    ]


@router.delete("/api-keys/{key_id}", status_code=204)
async def delete_api_key(
    key_id: int,
    _user: CurrentUser,
):
    _t = lambda x, **kwargs: x

    async with get_session_maker()() as session:
        async with session.begin():
            result = await session.execute(
                """DELETE FROM api_keys WHERE id = :key_id RETURNING key_hash""",
                {"key_id": key_id},
            )
            row = result.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail=_t("api_key_not_found", key_id=key_id))

    return None