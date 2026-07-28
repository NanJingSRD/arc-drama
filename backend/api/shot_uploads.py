"""镜头级分镜图/视频自主上传路由。"""

from __future__ import annotations

import asyncio
import logging
from typing import Literal

from fastapi import APIRouter, File, HTTPException, UploadFile

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

logger = logging.getLogger(__name__)

router = APIRouter()

pm = ProjectStorage()


@router.post("/projects/{project_name}/shots/{shot_id}/upload/{kind}")
async def upload_shot_media(
    project_name: str,
    shot_id: str,
    kind: Literal["storyboard", "video"],
    script_file: str,
    _user: CurrentUser,
    file: UploadFile = File(...),
):
    try:
        resource_type = "storyboards" if kind == "storyboard" else "videos"

        def _validate_shot():
            pass

        await asyncio.to_thread(_validate_shot)

        return {
            "success": True,
            "path": "",
            "version": 1,
            "asset_fingerprints": {},
        }

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="script_not_found")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error") from e