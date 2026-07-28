"""角色管理路由（CRUD 由 _asset_router_factory 统一生成）。"""

from ai_anidrama.api._asset_router_factory import build_asset_router

router = build_asset_router(asset_type="character")