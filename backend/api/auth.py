import hashlib
import logging
import os
import secrets
import string
import time
from collections import OrderedDict
from typing import Annotated

from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class CurrentUserInfo(BaseModel):
    id: str
    sub: str
    role: str = "admin"


_CACHED_TOKEN_SECRET: str | None = None
TOKEN_EXPIRY_SECONDS = 7 * 24 * 3600
_ANONYMOUS_USER_SUB = "local"
_DEFAULT_USER_ID = "default_user"


def get_admin_users() -> set[str]:
    raw = os.environ.get("ADMIN_USERS", "")
    users = set()
    for user in raw.split(","):
        user = user.strip()
        if user:
            users.add(user)
    return users


def is_admin_user(user_sub: str) -> bool:
    admin_users = get_admin_users()
    if admin_users:
        return user_sub in admin_users
    return True


_CACHED_JWT_SECRET_KEY: str | None = None
_DEFAULT_JWT_SECRET_KEY = "sRd_auth$9Pq2!sX7&jL5@bGtR4nDfH6mKpQwEaS2vYbN7cJ9xZrF5tUoI1"

_AUTH_ENABLED_VALUES = frozenset({"true", "1", "yes", "on"})


def is_auth_enabled() -> bool:
    return os.environ.get("AUTH_ENABLED", "false").strip().lower() in _AUTH_ENABLED_VALUES


def _anonymous_user() -> CurrentUserInfo:
    return CurrentUserInfo(id=_DEFAULT_USER_ID, sub=_ANONYMOUS_USER_SUB, role="admin")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


def get_token_secret() -> str:
    global _CACHED_TOKEN_SECRET
    env_secret = os.environ.get("AUTH_TOKEN_SECRET")
    if env_secret:
        return env_secret
    if _CACHED_TOKEN_SECRET is not None:
        return _CACHED_TOKEN_SECRET
    _CACHED_TOKEN_SECRET = secrets.token_hex(32)
    logger.info("已自动生成 JWT 签名密钥")
    return _CACHED_TOKEN_SECRET


def get_jwt_secret_key() -> str:
    global _CACHED_JWT_SECRET_KEY
    if _CACHED_JWT_SECRET_KEY is not None:
        return _CACHED_JWT_SECRET_KEY
    env_secret = os.environ.get("JWT_SECRET_KEY") or os.environ.get("SECRET_KEY")
    if env_secret:
        logger.info("使用环境变量 JWT_SECRET_KEY/SECRET_KEY (长度: %d)", len(env_secret))
        _CACHED_JWT_SECRET_KEY = env_secret
        return _CACHED_JWT_SECRET_KEY
    logger.info("使用默认外部 JWT 密钥")
    _CACHED_JWT_SECRET_KEY = _DEFAULT_JWT_SECRET_KEY
    return _CACHED_JWT_SECRET_KEY


def create_token(username: str) -> str:
    now = time.time()
    payload = {
        "sub": username,
        "iat": now,
        "exp": now + TOKEN_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, get_token_secret(), algorithm="HS256")


def create_download_token(user_sub: str, project_id: str) -> str:
    now = time.time()
    payload = {
        "sub": user_sub,
        "project_id": project_id,
        "iat": now,
        "exp": now + 300,
    }
    return jwt.encode(payload, get_token_secret(), algorithm="HS256")


def verify_download_token(token: str, expected_project_id: str) -> None:
    payload = jwt.decode(token, get_token_secret(), algorithms=["HS256"])
    if payload.get("project_id") != expected_project_id:
        raise ValueError("project_id_mismatch")


def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, get_token_secret(), algorithms=["HS256"])
        return payload
    except (JWTError, ExpiredSignatureError):
        return None


def verify_external_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, get_jwt_secret_key(), algorithms=["HS256"])
        return payload
    except (JWTError, ExpiredSignatureError):
        return None


def _payload_to_user(payload: dict) -> CurrentUserInfo:
    sub = payload.get("sub", "")
    role = payload.get("role")
    if role is None:
        role = "admin" if is_admin_user(sub) else "user"
    return CurrentUserInfo(id=_DEFAULT_USER_ID, sub=sub, role=role)


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme_optional)] = None,
) -> CurrentUserInfo:
    if not is_auth_enabled():
        if token:
            payload = verify_external_token(token)
            if payload is not None:
                return _payload_to_user(payload)
        return _anonymous_user()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="未认证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_external_token(token)
    if payload is not None:
        return _payload_to_user(payload)
    raise HTTPException(
        status_code=401,
        detail="token 无效或已过期",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user_flexible(
    token: Annotated[str | None, Depends(oauth2_scheme_optional)] = None,
    query_token: str | None = Query(None, alias="token"),
) -> CurrentUserInfo:
    if not is_auth_enabled():
        raw = token or query_token
        if raw:
            payload = verify_external_token(raw)
            if payload is not None:
                return _payload_to_user(payload)
        return _anonymous_user()
    raw = token or query_token
    if not raw:
        raise HTTPException(
            status_code=401,
            detail="缺少认证 token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_external_token(raw)
    if payload is not None:
        return _payload_to_user(payload)
    raise HTTPException(
        status_code=401,
        detail="token 无效或已过期",
        headers={"WWW-Authenticate": "Bearer"},
    )


CurrentUser = Annotated[CurrentUserInfo, Depends(get_current_user)]
CurrentUserFlexible = Annotated[CurrentUserInfo, Depends(get_current_user_flexible)]


async def require_current_user() -> CurrentUserInfo:
    return await get_current_user()


async def require_current_user_flexible() -> CurrentUserInfo:
    return await get_current_user_flexible()


router = APIRouter()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class VerifyResponse(BaseModel):
    valid: bool
    username: str


class AuthStatusResponse(BaseModel):
    enabled: bool


@router.get("/auth/status", response_model=AuthStatusResponse, summary="认证状态")
async def auth_status():
    return AuthStatusResponse(enabled=is_auth_enabled())


@router.post("/auth/token", response_model=TokenResponse, summary="登录获取token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    if not is_auth_enabled():
        token = create_token(form_data.username)
        logger.info("用户登录成功（认证未启用）: %s", form_data.username)
        return TokenResponse(access_token=token, token_type="bearer")
    raise HTTPException(
        status_code=401,
        detail="认证已启用，请联系管理员",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get("/auth/verify", response_model=VerifyResponse, summary="验证token")
async def verify(
    current_user: CurrentUser,
):
    return VerifyResponse(valid=True, username=current_user.sub)