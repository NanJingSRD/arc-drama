from datetime import datetime
from typing import List, Optional

from ai_anidrama.application.dtos.project import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    ProjectListResponse,
)
from ai_anidrama.core.exceptions import ProjectNotFoundError
from ai_anidrama.core.validators import validate_project_id, validate_project_name
from ai_anidrama.core.utils import generate_project_id
from ai_anidrama.domain.entities.project import Project
from ai_anidrama.domain.repositories.project import ProjectRepository


class ProjectService:
    def __init__(self, project_repo: ProjectRepository):
        self.project_repo = project_repo

    async def create_project(self, req: ProjectCreateRequest) -> ProjectResponse:
        project_id = req.name or generate_project_id(req.title)
        if project_id:
            validate_project_name(project_id)
        project = Project(
            project_id=project_id,
            name=project_id,
            title=req.title,
            style=req.style or "",
            content_mode=req.content_mode or "narration",
            source_kind=req.source_kind,
            episode_rewrite_mode=req.episode_rewrite_mode,
            style_template_id=req.style_template_id,
            aspect_ratio=req.aspect_ratio or "9:16",
            default_duration=req.default_duration,
            generation_mode=req.generation_mode or "storyboard",
            video_backend=req.video_backend,
            image_provider_t2i=req.image_provider_t2i,
            image_provider_i2i=req.image_provider_i2i,
            text_backend_script=req.text_backend_script,
            text_backend_overview=req.text_backend_overview,
            model_settings=req.model_settings,
            status="draft",
            progress=0.0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        await self.project_repo.create(project)
        return self._to_response(project)

    async def get_project(self, project_id: str) -> ProjectResponse:
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        return self._to_response(project)

    async def list_projects(self, query: str = None, style: str = None, status: str = None) -> ProjectListResponse:
        projects = await self.project_repo.get_all()
        responses = [self._to_response(p) for p in projects]
        # 前端筛选
        if query:
            q = query.lower()
            responses = [r for r in responses if q in r.title.lower() or q in r.project_id.lower()]
        if style:
            responses = [r for r in responses if style.lower() in r.style.lower()]
        if status:
            s = status.lower()
            responses = [r for r in responses if r.status and r.status.get("current_phase", "").lower() == s]
        return ProjectListResponse(projects=responses, total=len(responses))

    async def update_project(self, project_id: str, req: ProjectUpdateRequest) -> ProjectResponse:
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        if req.title is not None:
            project.title = req.title
        if req.style is not None:
            project.style = req.style
        if req.content_mode is not None:
            project.content_mode = req.content_mode
        if req.source_kind is not None:
            project.source_kind = req.source_kind
        if req.episode_rewrite_mode is not None:
            project.episode_rewrite_mode = req.episode_rewrite_mode
        if req.style_template_id is not None:
            project.style_template_id = req.style_template_id
        if req.generation_mode is not None:
            project.generation_mode = req.generation_mode
        if req.aspect_ratio is not None:
            project.aspect_ratio = req.aspect_ratio
        if req.default_duration is not None:
            project.default_duration = req.default_duration
        if req.video_backend is not None:
            project.video_backend = req.video_backend
        if req.image_provider_t2i is not None:
            project.image_provider_t2i = req.image_provider_t2i
        if req.image_provider_i2i is not None:
            project.image_provider_i2i = req.image_provider_i2i
        if req.text_backend_script is not None:
            project.text_backend_script = req.text_backend_script
        if req.model_settings is not None:
            project.model_settings = req.model_settings
        project.updated_at = datetime.now()

        await self.project_repo.update(project)
        return self._to_response(project)

    async def delete_project(self, project_id: str) -> None:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        await self.project_repo.delete(project_id)

    async def exists(self, project_id: str) -> bool:
        validate_project_id(project_id)
        return await self.project_repo.exists(project_id)

    async def add_episode(self, project_id: str, episode_number: int, title: str = None, script_file: str = None, generation_mode: str = None) -> dict:
        """添加剧集到项目"""
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        title = title or f"第{episode_number}集"
        project.add_episode(episode_number, title, script_file or "")
        if generation_mode:
            for ep in project.episodes:
                if ep.get("episode") == episode_number:
                    ep["generation_mode"] = generation_mode
                    break
        project.updated_at = datetime.now()
        await self.project_repo.update(project)
        episode = next((e for e in project.episodes if e.get("episode") == episode_number), {})
        return {"episode": episode_number, "title": title, "script_file": script_file, "generation_mode": generation_mode or "storyboard"}

    async def update_episode(self, project_id: str, episode_number: int, title: str = None, script_file: str = None) -> dict:
        """更新剧集信息"""
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        episode = next((e for e in project.episodes if e.get("episode") == episode_number), None)
        if not episode:
            raise ValueError(f"Episode {episode_number} not found in project {project_id}")
        if title is not None:
            episode["title"] = title
        if script_file is not None:
            episode["script_file"] = script_file
        project.updated_at = datetime.now()
        await self.project_repo.update(project)
        return episode

    async def delete_episode(self, project_id: str, episode_number: int) -> None:
        """删除指定剧集"""
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        project.episodes = [e for e in project.episodes if e.get("episode") != episode_number]
        project.updated_at = datetime.now()
        await self.project_repo.update(project)

    async def get_episodes(self, project_id: str) -> list:
        """获取项目的所有剧集列表"""
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        return project.episodes

    async def update_overview(self, project_id: str, synopsis: str = None, genre: str = None, theme: str = None, world_setting: str = None) -> dict:
        """更新项目概述"""
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)
        if project.overview is None:
            project.overview = {}
        if synopsis is not None:
            project.overview["synopsis"] = synopsis
        if genre is not None:
            project.overview["genre"] = genre
        if theme is not None:
            project.overview["theme"] = theme
        if world_setting is not None:
            project.overview["world_setting"] = world_setting
        project.updated_at = datetime.now()
        await self.project_repo.update(project)
        return project.overview

    CONTENT_MODE_LABELS = {
        "narration": "旁白模式",
        "drama": "剧集模式",
        "ad": "广告/短片模式",
    }

    def _to_response(self, project: Project) -> ProjectResponse:
        content_mode = project.content_mode or "narration"
        return ProjectResponse(
            project_id=project.project_id,
            name=project.name,
            title=project.title,
            style=project.style,
            thumbnail=project.thumbnail,
            description=project.description,
            content_mode=content_mode,
            content_mode_label=self.CONTENT_MODE_LABELS.get(content_mode, content_mode),
            source_kind=project.source_kind,
            episode_rewrite_mode=project.episode_rewrite_mode,
            style_template_id=project.style_template_id,
            aspect_ratio=project.aspect_ratio,
            default_duration=project.default_duration,
            generation_mode=project.generation_mode,
            video_backend=project.video_backend,
            image_provider_t2i=project.image_provider_t2i,
            image_provider_i2i=project.image_provider_i2i,
            text_backend_script=project.text_backend_script,
            text_backend_overview=project.text_backend_overview,
            model_settings=project.model_settings,
            overview=project.overview,
            status={"current_phase": project.status} if project.status else None,
            progress=project.progress,
            episodes_count=len(project.episodes),
            characters_count=len(project.characters),
            scenes_count=len(project.scenes),
            props_count=len(project.props),
            current_phase_label=project.status,
            metadata={
                "created_at": project.created_at.isoformat() if isinstance(project.created_at, datetime) else str(project.created_at),
                "updated_at": project.updated_at.isoformat() if isinstance(project.updated_at, datetime) else str(project.updated_at),
            },
            episodes=project.episodes,
            created_at=project.created_at,
            updated_at=project.updated_at,
            characters=project.characters,
            scenes=project.scenes,
            props=project.props,
        )