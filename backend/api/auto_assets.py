import logging
from typing import Any

logger = logging.getLogger(__name__)

from fastapi import APIRouter, HTTPException

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

router = APIRouter()

pm = ProjectStorage()

def get_project_manager() -> ProjectStorage:
    return pm

@router.post("/projects/{project_id}/auto-assets/extract", summary="从剧本提取资产")
async def extract_assets_from_script(
    project_id: str,
    _user: CurrentUser,
):
    try:
        from ai_anidrama.domain.services.asset_extractor import AssetExtractor

        def _sync():
            project = get_project_manager().load_project(project_id)
            extractor = AssetExtractor(project_id)
            extractor.extract(project)
            get_project_manager().save_project(project_id, project)

        await _sync()

        return {"success": True, "message": "资产提取完成"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/auto-assets/generate", summary="自动生成所有资产")
async def auto_generate_assets(
    project_id: str,
    _user: CurrentUser,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()

        project = get_project_manager().load_project(project_id)

        characters = project.get("characters", {})
        scenes = project.get("scenes", {})
        props = project.get("props", {})

        submitted = []

        for name, char in characters.items():
            if not char.get("image"):
                result = await queue.enqueue_task(
                    project_name=project_id,
                    task_type="character",
                    media_type="image",
                    resource_id=name,
                    payload={"prompt": char.get("description", "")},
                    user_id=_user.id,
                )
                submitted.append({"type": "character", "name": name, "task_id": result["task_id"]})

        for name, scene in scenes.items():
            if not scene.get("image"):
                result = await queue.enqueue_task(
                    project_name=project_id,
                    task_type="scene",
                    media_type="image",
                    resource_id=name,
                    payload={"prompt": scene.get("description", "")},
                    user_id=_user.id,
                )
                submitted.append({"type": "scene", "name": name, "task_id": result["task_id"]})

        for name, prop in props.items():
            if not prop.get("image"):
                result = await queue.enqueue_task(
                    project_name=project_id,
                    task_type="prop",
                    media_type="image",
                    resource_id=name,
                    payload={"prompt": prop.get("description", "")},
                    user_id=_user.id,
                )
                submitted.append({"type": "prop", "name": name, "task_id": result["task_id"]})

        return {
            "success": True,
            "message": f"已提交 {len(submitted)} 个资产生成任务",
            "submitted": submitted,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")