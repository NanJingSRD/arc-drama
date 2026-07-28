"""参考生视频 CRUD + 生成路由。

此文件保留但不注册任何路由，因为备份中所有参考视频接口均已注释。
"""

from fastapi import APIRouter

router = APIRouter(
    prefix="/projects/{project_name}/reference-videos",
    tags=["reference-videos"],
)