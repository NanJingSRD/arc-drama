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

@router.post("/projects/{project_id}/cost-estimation", summary="估算费用")
async def estimate_cost(
    project_id: str,
    _user: CurrentUser,
):
    try:
        project = get_project_manager().load_project(project_id)

        scenes = project.get("scenes", [])
        total_cost = 0
        breakdown = []

        for scene in scenes:
            if isinstance(scene, dict):
                shots = scene.get("shots", [])
                scene_cost = len(shots) * 0.1
                breakdown.append({"scene": scene.get("scene_id", ""), "cost": scene_cost})
                total_cost += scene_cost

        return {
            "success": True,
            "total_cost": total_cost,
            "breakdown": breakdown,
            "message": f"费用估算完成，共计 {total_cost} 单位",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")