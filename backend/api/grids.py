"""
宫格图生成 API 路由

此文件保留但不注册任何路由，因为备份中所有宫格图接口均已注释。
"""

from fastapi import APIRouter

router = APIRouter(prefix="/projects/{project_name}", tags=["grids"])