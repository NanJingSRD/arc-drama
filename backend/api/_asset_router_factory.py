"""项目级资产 CRUD 路由的统一工厂（character / scene / prop / product）。"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

logger = logging.getLogger(__name__)


_I18N_KEYS: dict[str, dict[str, str]] = {
    "character": {
        "exists": "character_already_exists",
        "not_found": "character_not_found",
        "deleted": "character_deleted",
    },
    "scene": {
        "exists": "project_scene_already_exists",
        "not_found": "project_scene_not_found",
        "deleted": "project_scene_deleted",
    },
    "prop": {
        "exists": "prop_already_exists",
        "not_found": "prop_not_found",
        "deleted": "prop_deleted",
    },
    "product": {
        "exists": "product_already_exists",
        "not_found": "product_not_found",
        "deleted": "product_deleted",
    },
}


_ASSET_SPECS: dict[str, dict] = {
    "character": {"subdir": "characters", "bucket_key": "characters", "sheet_field": "image_file"},
    "scene": {"subdir": "scenes", "bucket_key": "scenes", "sheet_field": "image_file"},
    "prop": {"subdir": "props", "bucket_key": "props", "sheet_field": "image_file"},
    "product": {"subdir": "products", "bucket_key": "products", "sheet_field": "image_file"},
}


def _is_string_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


class _CreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str
    description: str = ""


def build_asset_router(
    *,
    asset_type: str,
) -> APIRouter:
    if asset_type not in _ASSET_SPECS:
        raise ValueError(f"unknown asset_type: {asset_type}")
    spec = _ASSET_SPECS[asset_type]
    keys = _I18N_KEYS[asset_type]
    result_key = asset_type

    router = APIRouter()

    @router.post(f"/projects/{{project_name}}/{spec['subdir']}")
    async def add_entry(
        project_name: str,
        req: _CreateRequest,
        _user: CurrentUser,
    ):
        _ = lambda x: x
        name = req.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="asset_name_required")

        extras = req.model_extra or {}

        try:

            def _sync():
                storage = ProjectStorage()
                project = storage.load_project(project_name)
                bucket = project.setdefault(spec["bucket_key"], {})

                if name in bucket:
                    raise HTTPException(status_code=409, detail=_t(keys["exists"], name=name))

                entry: dict[str, Any] = {"description": req.description, spec["sheet_field"]: ""}
                for field, value in extras.items():
                    if isinstance(value, str):
                        entry[field] = value
                    elif isinstance(value, list) and all(isinstance(item, str) for item in value):
                        entry[field] = value
                    else:
                        entry[field] = value

                bucket[name] = entry
                storage.save_project(project_name, project)

                return {"success": True, result_key: bucket[name]}

            _t = lambda x, **kwargs: x
            return await asyncio.to_thread(_sync)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("请求处理失败")
            raise HTTPException(status_code=500, detail=str(exc))

    @router.patch(f"/projects/{{project_name}}/{spec['subdir']}/{{entry_name}}")
    async def update_entry(
        project_name: str,
        entry_name: str,
        req: dict[str, Any],
        _user: CurrentUser,
    ):
        _t = lambda x, **kwargs: x

        try:

            def _sync():
                storage = ProjectStorage()
                project = storage.load_project(project_name)
                bucket = project.get(spec["bucket_key"], {})

                if entry_name not in bucket:
                    raise HTTPException(status_code=404, detail=_t(keys["not_found"], name=entry_name))

                entry = bucket[entry_name]
                for field, value in req.items():
                    if value is not None:
                        entry[field] = value

                storage.save_project(project_name, project)
                return {"success": True, result_key: entry}

            return await asyncio.to_thread(_sync)
        except HTTPException:
            raise
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
        except Exception as exc:
            logger.exception("请求处理失败")
            raise HTTPException(status_code=500, detail=str(exc))

    @router.delete(f"/projects/{{project_name}}/{spec['subdir']}/{{entry_name}}")
    async def delete_entry(project_name: str, entry_name: str, _user: CurrentUser):
        _t = lambda x, **kwargs: x

        try:

            def _sync():
                storage = ProjectStorage()
                project = storage.load_project(project_name)
                bucket = project.get(spec["bucket_key"], {})

                if entry_name not in bucket:
                    raise HTTPException(status_code=404, detail=_t(keys["not_found"], name=entry_name))

                del bucket[entry_name]
                storage.save_project(project_name, project)

                return {"success": True, "message": _t(keys["deleted"], name=entry_name)}

            return await asyncio.to_thread(_sync)
        except HTTPException:
            raise
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
        except Exception as exc:
            logger.exception("请求处理失败")
            raise HTTPException(status_code=500, detail=str(exc))

    return router