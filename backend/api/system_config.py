"""
System configuration APIs.
"""

import logging
import math
from typing import Any

from fastapi import APIRouter

from ai_anidrama.api.auth import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter()


class SystemConfigPatchRequest:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


@router.get("/system/config")
async def get_system_config(
    _user: CurrentUser,
) -> dict[str, Any]:
    return {
        "settings": {
            "default_video_backend": "",
            "default_image_backend": "",
            "default_image_backend_t2i": "",
            "default_image_backend_i2i": "",
            "default_text_backend": "",
            "default_audio_backend": "",
            "narration_voice": "",
            "narration_speed": 1.0,
            "video_generate_audio": False,
            "anthropic_api_key": {"is_set": False, "masked": None},
            "anthropic_base_url": None,
            "anthropic_model": None,
            "anthropic_default_haiku_model": None,
            "anthropic_default_opus_model": None,
            "anthropic_default_sonnet_model": None,
            "claude_code_subagent_model": None,
            "agent_session_cleanup_delay_seconds": 300,
            "agent_max_concurrent_sessions": 5,
            "text_backend_script": "",
            "text_backend_overview": "",
            "text_backend_style": "",
        },
        "options": {
            "video_backends": [],
            "image_backends": [],
            "text_backends": [],
            "audio_backends": [],
            "provider_names": {},
        },
    }


@router.get("/system/version")
async def get_system_version(
    _user: CurrentUser,
) -> dict[str, Any]:
    return {
        "current": {"version": "1.0.0"},
        "latest": None,
        "has_update": False,
        "checked_at": "",
        "update_check_error": None,
    }


@router.patch("/system/config")
async def patch_system_config(
    req: dict,
    _user: CurrentUser,
) -> dict[str, Any]:
    return await get_system_config(_user)