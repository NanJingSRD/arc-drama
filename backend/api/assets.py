"""资产管理路由"""

import logging

from fastapi import APIRouter, Body, HTTPException
from fastapi import Path as FastAPIPath
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from ai_anidrama.api.auth import is_auth_enabled, require_current_user
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

router = APIRouter()

_ = lambda x: x


def get_project_storage() -> ProjectStorage:
    return ProjectStorage()


def _check_project_ownership(storage: ProjectStorage, project_name: str, user_sub: str, user_role: str = "admin", auth_enabled: bool = False) -> None:
    if not auth_enabled:
        return
    try:
        project = storage.load_project(project_name)
        project_owner = project.get("owner")
        if project_owner is None:
            if user_role != "admin":
                raise HTTPException(status_code=403, detail="project_access_denied")
        elif project_owner != user_sub:
            raise HTTPException(status_code=403, detail="project_access_denied")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")


class CharacterCreateRequest(BaseModel):
    name: str
    description: str | None = None
    image_file: str | None = None
    gender: str | None = None
    age: int | None = None


class CharacterUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    image_file: str | None = None
    gender: str | None = None
    age: int | None = None


class SceneCreateRequest(BaseModel):
    name: str
    description: str | None = None
    image_file: str | None = None


class SceneUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    image_file: str | None = None


class PropCreateRequest(BaseModel):
    name: str
    description: str | None = None
    image_file: str | None = None


class PropUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    image_file: str | None = None


@router.get("/projects/{project_id}/assets/characters", summary="获取角色列表")
async def get_characters(project_id: str = FastAPIPath(..., description="项目ID")):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        characters = project.get("characters", {})

        return {"characters": list(characters.values())}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.post("/projects/{project_id}/assets/characters", summary="创建角色")
async def create_character(project_id: str = FastAPIPath(..., description="项目ID"), req: CharacterCreateRequest = Body(...)):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        characters = project.setdefault("characters", {})

        character_id = f"char_{len(characters) + 1}"
        character = {
            "id": character_id,
            "name": req.name,
            "description": req.description or "",
            "image_file": req.image_file or "",
            "gender": req.gender or "",
            "age": req.age or 0,
        }

        characters[character_id] = character
        storage.save_project(project_id, project)

        return {"success": True, "character": character}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{project_id}/assets/characters/{character_id}", summary="获取角色详情")
async def get_character(
    project_id: str = FastAPIPath(..., description="项目ID"),
    character_id: str = FastAPIPath(..., description="角色ID"),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        characters = project.get("characters", {})

        character = characters.get(character_id)
        if not character:
            raise HTTPException(status_code=404, detail=f"character_not_found: {character_id}")

        return {"character": character}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.patch("/projects/{project_id}/assets/characters/{character_id}", summary="更新角色")
async def update_character(
    project_id: str = FastAPIPath(..., description="项目ID"),
    character_id: str = FastAPIPath(..., description="角色ID"),
    req: CharacterUpdateRequest = Body(...),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        characters = project.get("characters", {})

        character = characters.get(character_id)
        if not character:
            raise HTTPException(status_code=404, detail=f"character_not_found: {character_id}")

        if req.name is not None:
            character["name"] = req.name
        if req.description is not None:
            character["description"] = req.description or ""
        if req.image_file is not None:
            character["image_file"] = req.image_file or ""
        if req.gender is not None:
            character["gender"] = req.gender or ""
        if req.age is not None:
            character["age"] = req.age or 0

        storage.save_project(project_id, project)

        return {"success": True, "character": character}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.delete("/projects/{project_id}/assets/characters/{character_id}", summary="删除角色")
async def delete_character(
    project_id: str = FastAPIPath(..., description="项目ID"),
    character_id: str = FastAPIPath(..., description="角色ID"),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        characters = project.get("characters", {})

        if character_id not in characters:
            raise HTTPException(status_code=404, detail=f"character_not_found: {character_id}")

        del characters[character_id]
        storage.save_project(project_id, project)

        return {"success": True, "message": f"character_deleted: {character_id}"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{project_id}/assets/scenes", summary="获取场景列表")
async def get_scenes(project_id: str = FastAPIPath(..., description="项目ID")):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        scenes = project.get("scenes", {})

        return {"scenes": list(scenes.values())}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.post("/projects/{project_id}/assets/scenes", summary="创建场景")
async def create_scene(project_id: str = FastAPIPath(..., description="项目ID"), req: SceneCreateRequest = Body(...)):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        scenes = project.setdefault("scenes", {})

        scene_id = f"scene_{len(scenes) + 1}"
        scene = {
            "id": scene_id,
            "name": req.name,
            "description": req.description or "",
            "image_file": req.image_file or "",
        }

        scenes[scene_id] = scene
        storage.save_project(project_id, project)

        return {"success": True, "scene": scene}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{project_id}/assets/scenes/{scene_id}", summary="获取场景详情")
async def get_scene(
    project_id: str = FastAPIPath(..., description="项目ID"),
    scene_id: str = FastAPIPath(..., description="场景ID"),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        scenes = project.get("scenes", {})

        scene = scenes.get(scene_id)
        if not scene:
            raise HTTPException(status_code=404, detail=f"scene_not_found: {scene_id}")

        return {"scene": scene}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.patch("/projects/{project_id}/assets/scenes/{scene_id}", summary="更新场景")
async def update_scene(
    project_id: str = FastAPIPath(..., description="项目ID"),
    scene_id: str = FastAPIPath(..., description="场景ID"),
    req: SceneUpdateRequest = Body(...),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        scenes = project.get("scenes", {})

        scene = scenes.get(scene_id)
        if not scene:
            raise HTTPException(status_code=404, detail=f"scene_not_found: {scene_id}")

        if req.name is not None:
            scene["name"] = req.name
        if req.description is not None:
            scene["description"] = req.description or ""
        if req.image_file is not None:
            scene["image_file"] = req.image_file or ""

        storage.save_project(project_id, project)

        return {"success": True, "scene": scene}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.delete("/projects/{project_id}/assets/scenes/{scene_id}", summary="删除场景")
async def delete_scene(
    project_id: str = FastAPIPath(..., description="项目ID"),
    scene_id: str = FastAPIPath(..., description="场景ID"),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        scenes = project.get("scenes", {})

        if scene_id not in scenes:
            raise HTTPException(status_code=404, detail=f"scene_not_found: {scene_id}")

        del scenes[scene_id]
        storage.save_project(project_id, project)

        return {"success": True, "message": f"scene_deleted: {scene_id}"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{project_id}/assets/props", summary="获取道具列表")
async def get_props(project_id: str = FastAPIPath(..., description="项目ID")):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        props = project.get("props", {})

        return {"props": list(props.values())}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.post("/projects/{project_id}/assets/props", summary="创建道具")
async def create_prop(project_id: str = FastAPIPath(..., description="项目ID"), req: PropCreateRequest = Body(...)):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        props = project.setdefault("props", {})

        prop_id = f"prop_{len(props) + 1}"
        prop = {
            "id": prop_id,
            "name": req.name,
            "description": req.description or "",
            "image_file": req.image_file or "",
        }

        props[prop_id] = prop
        storage.save_project(project_id, project)

        return {"success": True, "prop": prop}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{project_id}/assets/props/{prop_id}", summary="获取道具详情")
async def get_prop(
    project_id: str = FastAPIPath(..., description="项目ID"),
    prop_id: str = FastAPIPath(..., description="道具ID"),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        props = project.get("props", {})

        prop = props.get(prop_id)
        if not prop:
            raise HTTPException(status_code=404, detail=f"prop_not_found: {prop_id}")

        return {"prop": prop}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.patch("/projects/{project_id}/assets/props/{prop_id}", summary="更新道具")
async def update_prop(
    project_id: str = FastAPIPath(..., description="项目ID"),
    prop_id: str = FastAPIPath(..., description="道具ID"),
    req: PropUpdateRequest = Body(...),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        props = project.get("props", {})

        prop = props.get(prop_id)
        if not prop:
            raise HTTPException(status_code=404, detail=f"prop_not_found: {prop_id}")

        if req.name is not None:
            prop["name"] = req.name
        if req.description is not None:
            prop["description"] = req.description or ""
        if req.image_file is not None:
            prop["image_file"] = req.image_file or ""

        storage.save_project(project_id, project)

        return {"success": True, "prop": prop}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.delete("/projects/{project_id}/assets/props/{prop_id}", summary="删除道具")
async def delete_prop(
    project_id: str = FastAPIPath(..., description="项目ID"),
    prop_id: str = FastAPIPath(..., description="道具ID"),
):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        _check_project_ownership(storage, project_id, current_user.sub, user_role=current_user.role, auth_enabled=is_auth_enabled())

        project = storage.load_project(project_id)
        props = project.get("props", {})

        if prop_id not in props:
            raise HTTPException(status_code=404, detail=f"prop_not_found: {prop_id}")

        del props[prop_id]
        storage.save_project(project_id, project)

        return {"success": True, "message": f"prop_deleted: {prop_id}"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_id}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/assets/{asset_type}/{asset_id}", summary="全局资产库 - 获取资产")
async def get_global_asset(
    asset_type: str = FastAPIPath(..., description="资产类型"),
    asset_id: str = FastAPIPath(..., description="资产ID"),
):
    current_user = await require_current_user()
    try:
        if asset_type not in ("characters", "scenes", "props"):
            raise HTTPException(status_code=404, detail="asset_type_not_found")

        raise HTTPException(status_code=500, detail="global_asset_not_implemented")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/assets/{asset_type}", summary="全局资产库 - 获取资产列表")
async def list_global_assets(asset_type: str = FastAPIPath(..., description="资产类型")):
    current_user = await require_current_user()
    try:
        if asset_type not in ("characters", "scenes", "props"):
            raise HTTPException(status_code=404, detail="asset_type_not_found")

        raise HTTPException(status_code=500, detail="global_asset_not_implemented")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.post("/assets/{asset_type}", summary="全局资产库 - 创建资产")
async def create_global_asset(asset_type: str = FastAPIPath(..., description="资产类型")):
    current_user = await require_current_user()
    try:
        if asset_type not in ("characters", "scenes", "props"):
            raise HTTPException(status_code=404, detail="asset_type_not_found")

        raise HTTPException(status_code=500, detail="global_asset_not_implemented")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.patch("/assets/{asset_type}/{asset_id}", summary="全局资产库 - 更新资产")
async def update_global_asset(
    asset_type: str = FastAPIPath(..., description="资产类型"),
    asset_id: str = FastAPIPath(..., description="资产ID"),
):
    current_user = await require_current_user()
    try:
        if asset_type not in ("characters", "scenes", "props"):
            raise HTTPException(status_code=404, detail="asset_type_not_found")

        raise HTTPException(status_code=500, detail="global_asset_not_implemented")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.delete("/assets/{asset_type}/{asset_id}", summary="全局资产库 - 删除资产")
async def delete_global_asset(
    asset_type: str = FastAPIPath(..., description="资产类型"),
    asset_id: str = FastAPIPath(..., description="资产ID"),
):
    current_user = await require_current_user()
    try:
        if asset_type not in ("characters", "scenes", "props"):
            raise HTTPException(status_code=404, detail="asset_type_not_found")

        raise HTTPException(status_code=500, detail="global_asset_not_implemented")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")