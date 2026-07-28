from datetime import datetime
from typing import List, Optional

from ai_anidrama.domain.entities.project import Project
from ai_anidrama.domain.repositories.project import ProjectRepository
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage


class ProjectRepositoryImpl(ProjectRepository):
    def __init__(self, storage: ProjectStorage):
        self.storage = storage

    async def get_by_id(self, project_id: str) -> Optional[Project]:
        try:
            data = self.storage.load_project(project_id)
            return Project(
                project_id=data.get("project_id", project_id),
                name=data.get("name", ""),
                title=data.get("title", ""),
                style=data.get("style", ""),
                thumbnail=data.get("thumbnail"),
                description=data.get("description"),
                content_mode=data.get("content_mode", "narration"),
                source_kind=data.get("source_kind"),
                episode_rewrite_mode=data.get("episode_rewrite_mode"),
                style_template_id=data.get("style_template_id"),
                aspect_ratio=data.get("aspect_ratio", "9:16"),
                default_duration=data.get("default_duration"),
                generation_mode=data.get("generation_mode", "storyboard"),
                video_backend=data.get("video_backend"),
                image_provider_t2i=data.get("image_provider_t2i"),
                image_provider_i2i=data.get("image_provider_i2i"),
                text_backend_script=data.get("text_backend_script"),
                text_backend_overview=data.get("text_backend_overview"),
                model_settings=data.get("model_settings"),
                characters=data.get("characters", {}),
                scenes=data.get("scenes", {}),
                props=data.get("props", {}),
                overview=data.get("overview"),
                episodes=data.get("episodes", []),
                status=data.get("status", "draft"),
                progress=data.get("progress", 0.0),
                created_at=datetime.fromisoformat(str(data.get("created_at"))) if data.get("created_at") else datetime.now(),
                updated_at=datetime.fromisoformat(str(data.get("updated_at"))) if data.get("updated_at") else datetime.now(),
            )
        except Exception:
            return None

    async def get_all(self) -> List[Project]:
        projects = []
        for project_id in self.storage.list_projects():
            project = await self.get_by_id(project_id)
            if project:
                projects.append(project)
        return projects

    async def create(self, project: Project) -> Project:
        data = {
            "project_id": project.project_id,
            "name": project.name,
            "title": project.title,
            "style": project.style,
            "description": project.description,
            "content_mode": project.content_mode,
            "source_kind": project.source_kind,
            "episode_rewrite_mode": project.episode_rewrite_mode,
            "style_template_id": project.style_template_id,
            "aspect_ratio": project.aspect_ratio,
            "default_duration": project.default_duration,
            "generation_mode": project.generation_mode,
            "video_backend": project.video_backend,
            "image_provider_t2i": project.image_provider_t2i,
            "image_provider_i2i": project.image_provider_i2i,
            "text_backend_script": project.text_backend_script,
            "text_backend_overview": project.text_backend_overview,
            "model_settings": project.model_settings,
            "characters": project.characters,
            "scenes": project.scenes,
            "props": project.props,
            "episodes": project.episodes,
            "status": project.status,
            "progress": project.progress,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
        }
        if project.thumbnail is not None:
            data["thumbnail"] = project.thumbnail
        if project.overview is not None:
            data["overview"] = project.overview
        self.storage.create_project(project.project_id, data)
        return project

    async def update(self, project: Project) -> Project:
        data = {
            "project_id": project.project_id,
            "name": project.name,
            "title": project.title,
            "style": project.style,
            "description": project.description,
            "content_mode": project.content_mode,
            "source_kind": project.source_kind,
            "episode_rewrite_mode": project.episode_rewrite_mode,
            "style_template_id": project.style_template_id,
            "aspect_ratio": project.aspect_ratio,
            "default_duration": project.default_duration,
            "generation_mode": project.generation_mode,
            "video_backend": project.video_backend,
            "image_provider_t2i": project.image_provider_t2i,
            "image_provider_i2i": project.image_provider_i2i,
            "text_backend_script": project.text_backend_script,
            "text_backend_overview": project.text_backend_overview,
            "model_settings": project.model_settings,
            "characters": project.characters,
            "scenes": project.scenes,
            "props": project.props,
            "episodes": project.episodes,
            "status": project.status,
            "progress": project.progress,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
        }
        if project.thumbnail is not None:
            data["thumbnail"] = project.thumbnail
        if project.overview is not None:
            data["overview"] = project.overview
        self.storage.save_project(project.project_id, data)
        return project

    async def delete(self, project_id: str) -> None:
        self.storage.delete_project(project_id)

    async def exists(self, project_id: str) -> bool:
        return self.storage.project_exists(project_id)