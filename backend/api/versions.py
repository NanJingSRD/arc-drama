"""
版本管理 API 路由

处理版本查询和还原请求。
"""

import asyncio
import logging
from collections.abc import Callable
from pathlib import Path

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

router = APIRouter()

pm = ProjectStorage()

_RESTORABLE_RESOURCE_TYPES = frozenset(
    {"storyboards", "videos", "characters", "scenes", "props", "products", "reference_videos"}
)


def _resolve_resource_path(
    resource_type: str,
    resource_id: str,
    project_path: Path,
    _t: Callable[..., str],
) -> tuple[Path, str]:
    if resource_type not in _RESTORABLE_RESOURCE_TYPES:
        raise HTTPException(status_code=400, detail=_t("unsupported_resource_type", resource_type=resource_type))
    relative = f"{resource_type}/{resource_id}"
    current_file = project_path / relative
    return current_file, relative


def _sync_metadata(
    resource_type: str,
    project_name: str,
    resource_id: str,
    file_path: str,
    project_path: Path,
) -> None:
    pass


@router.get("/projects/{project_name}/versions/{resource_type}/{resource_id}")
async def get_versions(
    project_name: str,
    resource_type: str,
    resource_id: str,
    _user: CurrentUser,
):
    _ = lambda x, **kwargs: x
    try:
        def _sync():
            return {"resource_type": resource_type, "resource_id": resource_id, "versions": []}

        return await asyncio.to_thread(_sync)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.post("/projects/{project_name}/versions/{resource_type}/{resource_id}/restore/{version}")
async def restore_version(
    project_name: str,
    resource_type: str,
    resource_id: str,
    version: int,
    _user: CurrentUser,
):
    _ = lambda x, **kwargs: x
    try:
        def _sync():
            project_path = Path(pm.get_project_path(project_name))
            current_file, file_path = _resolve_resource_path(resource_type, resource_id, project_path, _)
            _sync_metadata(resource_type, project_name, resource_id, file_path, project_path)

            return {
                "success": True,
                "file_path": file_path,
                "asset_fingerprints": {},
            }

        return await asyncio.to_thread(_sync)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")