from datetime import datetime
from typing import List

from ai_anidrama.application.dtos.asset import (
    CharacterResponse,
    CharacterListResponse,
    CharacterCreateRequest,
    CharacterUpdateRequest,
    SceneResponse,
    SceneListResponse,
    SceneCreateRequest,
    SceneUpdateRequest,
    PropResponse,
    PropListResponse,
    PropCreateRequest,
    PropUpdateRequest,
    AssetGenerateRequest,
    AssetGenerateResponse,
    AssetDesignRequest,
    AssetDesignResponse,
    AssetOperationResponse,
)
from ai_anidrama.core.exceptions import ProjectNotFoundError, AssetNotFoundError
from ai_anidrama.core.validators import validate_project_id, validate_asset_name
from ai_anidrama.domain.repositories.project import ProjectRepository
from ai_anidrama.infrastructure.external.queue.task_queue import TaskQueue


class AssetService:
    def __init__(self, project_repo: ProjectRepository, task_queue: TaskQueue):
        self.project_repo = project_repo
        self.task_queue = task_queue

    async def list_characters(self, project_id: str) -> CharacterListResponse:
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        characters = []
        for name, data in project.characters.items():
            characters.append(CharacterResponse(
                name=name,
                description=data.get("description", ""),
                voice_style=data.get("voice_style", ""),
                image_url=data.get("image_url"),
                image_prompt=data.get("image_prompt"),
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ))
        return CharacterListResponse(characters=characters, total=len(characters))

    async def get_character(self, project_id: str, name: str) -> CharacterResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.characters:
            raise AssetNotFoundError(project_id, "character", name)

        data = project.characters[name]
        return CharacterResponse(
            name=name,
            description=data.get("description", ""),
            voice_style=data.get("voice_style", ""),
            image_url=data.get("image_url"),
            image_prompt=data.get("image_prompt"),
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    async def list_scenes(self, project_id: str) -> SceneListResponse:
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        scenes = []
        for name, data in project.scenes.items():
            scenes.append(SceneResponse(
                name=name,
                description=data.get("description", ""),
                image_url=data.get("image_url"),
                image_prompt=data.get("image_prompt"),
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ))
        return SceneListResponse(scenes=scenes, total=len(scenes))

    async def get_scene(self, project_id: str, name: str) -> SceneResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.scenes:
            raise AssetNotFoundError(project_id, "scene", name)

        data = project.scenes[name]
        return SceneResponse(
            name=name,
            description=data.get("description", ""),
            image_url=data.get("image_url"),
            image_prompt=data.get("image_prompt"),
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    async def list_props(self, project_id: str) -> PropListResponse:
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        props = []
        for name, data in project.props.items():
            props.append(PropResponse(
                name=name,
                description=data.get("description", ""),
                image_url=data.get("image_url"),
                image_prompt=data.get("image_prompt"),
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ))
        return PropListResponse(props=props, total=len(props))

    async def get_prop(self, project_id: str, name: str) -> PropResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.props:
            raise AssetNotFoundError(project_id, "prop", name)

        data = project.props[name]
        return PropResponse(
            name=name,
            description=data.get("description", ""),
            image_url=data.get("image_url"),
            image_prompt=data.get("image_prompt"),
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    async def generate_assets(self, project_id: str, req: AssetGenerateRequest) -> AssetGenerateResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)

        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="auto_assets",
            media_type="text",
            resource_id="auto_assets",
            payload={"asset_type": req.asset_type},
        )

        return AssetGenerateResponse(
            success=True,
            message="任务已入队，正在生成资产",
            task_id=result["task_id"],
        )

    async def generate_character_design(self, project_id: str, req: AssetDesignRequest) -> AssetDesignResponse:
        validate_project_id(project_id)
        validate_asset_name(req.name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        if req.name not in project.characters:
            raise AssetNotFoundError(project_id, "character", req.name)

        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="character",
            media_type="image",
            resource_id=req.name,
            payload={"prompt": req.prompt},
        )

        return AssetDesignResponse(
            success=True,
            message="任务已入队，正在生成角色设计图",
            task_id=result["task_id"],
            image_url=None,
        )

    async def generate_scene_design(self, project_id: str, req: AssetDesignRequest) -> AssetDesignResponse:
        validate_project_id(project_id)
        validate_asset_name(req.name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        if req.name not in project.scenes:
            raise AssetNotFoundError(project_id, "scene", req.name)

        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="scene",
            media_type="image",
            resource_id=req.name,
            payload={"prompt": req.prompt},
        )

        return AssetDesignResponse(
            success=True,
            message="任务已入队，正在生成场景设计图",
            task_id=result["task_id"],
            image_url=None,
        )

    async def generate_prop_design(self, project_id: str, req: AssetDesignRequest) -> AssetDesignResponse:
        validate_project_id(project_id)
        validate_asset_name(req.name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        if req.name not in project.props:
            raise AssetNotFoundError(project_id, "prop", req.name)

        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="prop",
            media_type="image",
            resource_id=req.name,
            payload={"prompt": req.prompt},
        )

        return AssetDesignResponse(
            success=True,
            message="任务已入队，正在生成道具设计图",
            task_id=result["task_id"],
            image_url=None,
        )

    async def create_character(self, project_id: str, req: CharacterCreateRequest) -> CharacterResponse:
        validate_project_id(project_id)
        validate_asset_name(req.name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        project.add_character(
            name=req.name,
            description=req.description,
            voice_style=req.voice_style,
            image_url=req.image_url,
            image_prompt=req.image_prompt,
        )
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return await self.get_character(project_id, req.name)

    async def update_character(self, project_id: str, name: str, req: CharacterUpdateRequest) -> CharacterResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.characters:
            raise AssetNotFoundError(project_id, "character", name)

        project.update_character(name, req.description, req.voice_style)
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return await self.get_character(project_id, name)

    async def delete_character(self, project_id: str, name: str) -> AssetOperationResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.characters:
            raise AssetNotFoundError(project_id, "character", name)

        project.delete_character(name)
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return AssetOperationResponse(
            success=True,
            message=f"Character '{name}' deleted successfully",
        )

    async def create_scene(self, project_id: str, req: SceneCreateRequest) -> SceneResponse:
        validate_project_id(project_id)
        validate_asset_name(req.name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        project.add_scene(name=req.name, description=req.description, image_url=req.image_url)
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return await self.get_scene(project_id, req.name)

    async def update_scene(self, project_id: str, name: str, req: SceneUpdateRequest) -> SceneResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.scenes:
            raise AssetNotFoundError(project_id, "scene", name)

        project.update_scene(name, req.description)
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return await self.get_scene(project_id, name)

    async def delete_scene(self, project_id: str, name: str) -> AssetOperationResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.scenes:
            raise AssetNotFoundError(project_id, "scene", name)

        project.delete_scene(name)
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return AssetOperationResponse(
            success=True,
            message=f"Scene '{name}' deleted successfully",
        )

    async def create_prop(self, project_id: str, req: PropCreateRequest) -> PropResponse:
        validate_project_id(project_id)
        validate_asset_name(req.name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        project.add_prop(name=req.name, description=req.description, image_url=req.image_url)
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return await self.get_prop(project_id, req.name)

    async def update_prop(self, project_id: str, name: str, req: PropUpdateRequest) -> PropResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.props:
            raise AssetNotFoundError(project_id, "prop", name)

        project.update_prop(name, req.description)
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return await self.get_prop(project_id, name)

    async def delete_prop(self, project_id: str, name: str) -> AssetOperationResponse:
        validate_project_id(project_id)
        validate_asset_name(name)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if name not in project.props:
            raise AssetNotFoundError(project_id, "prop", name)

        project.delete_prop(name)
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

        return AssetOperationResponse(
            success=True,
            message=f"Prop '{name}' deleted successfully",
        )