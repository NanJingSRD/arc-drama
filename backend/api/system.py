"""系统级端点：诊断日志打包下载。"""

from fastapi import APIRouter

from ai_anidrama.api.auth import CurrentUser

router = APIRouter()


@router.get("/system/logs/download")
async def download_logs(_user: CurrentUser):
    raise HTTPException(status_code=500, detail="logs_download_not_implemented")