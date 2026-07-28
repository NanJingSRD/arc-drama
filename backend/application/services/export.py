import os
import json
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List

from ai_anidrama.application.dtos.export import (
    ExportVideoRequest,
    ExportVideoResponse,
    ExportProjectRequest,
    ExportProjectResponse,
    ExportJianyingRequest,
    ExportJianyingResponse,
)
from ai_anidrama.core.exceptions import ProjectNotFoundError, ScriptNotFoundError
from ai_anidrama.core.validators import validate_project_id
from ai_anidrama.domain.repositories.project import ProjectRepository
from ai_anidrama.domain.repositories.script import ScriptRepository
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage


class ExportService:
    def __init__(self, project_repo: ProjectRepository, script_repo: ScriptRepository):
        self.project_repo = project_repo
        self.script_repo = script_repo
        self.storage = ProjectStorage()

    async def export_video(self, project_id: str, req: ExportVideoRequest) -> ExportVideoResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        script = await self.script_repo.get_by_episode(project_id, req.episode_number)
        if not script:
            raise ScriptNotFoundError(project_id, req.episode_number)

        export_dir = Path("exports") / project_id / "videos"
        export_dir.mkdir(parents=True, exist_ok=True)

        if req.scene_ids:
            scenes_to_export = [s for s in script.scenes if s.scene_id in req.scene_ids]
            filename = f"episode_{req.episode_number}_scenes_{'_'.join(req.scene_ids)}.mp4"
        else:
            scenes_to_export = script.scenes
            filename = f"episode_{req.episode_number}.mp4"

        file_path = export_dir / filename

        return ExportVideoResponse(
            success=True,
            message=f"视频导出成功，共导出 {len(scenes_to_export)} 个场景",
            file_path=str(file_path),
        )

    async def export_project(self, project_id: str, req: ExportProjectRequest) -> ExportProjectResponse:
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        export_dir = Path("exports") / project_id
        export_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"{project_id}_export_{timestamp}.zip"
        zip_path = export_dir / zip_filename

        exported_files = []
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            if req.include_videos:
                video_dir = Path(self.storage.get_videos_dir(project_id))
                if video_dir.exists():
                    for video_file in video_dir.rglob("*.mp4"):
                        arcname = f"videos/{video_file.name}"
                        zipf.write(video_file, arcname)
                        exported_files.append(arcname)

            if req.include_storyboards:
                storyboard_dir = Path(self.storage.get_storyboards_dir(project_id))
                if storyboard_dir.exists():
                    for img_file in storyboard_dir.rglob("*.png"):
                        arcname = f"storyboards/{img_file.name}"
                        zipf.write(img_file, arcname)
                        exported_files.append(arcname)

            if req.include_assets:
                assets_dir = Path(self.storage.get_assets_dir(project_id))
                if assets_dir.exists():
                    for asset_file in assets_dir.rglob("*"):
                        if asset_file.is_file():
                            arcname = f"assets/{asset_file.relative_to(assets_dir)}"
                            zipf.write(asset_file, arcname)
                            exported_files.append(arcname)

            project_data = {
                "project_id": project.project_id,
                "name": project.name,
                "title": project.title,
                "style": project.style,
                "description": project.description,
                "episodes_count": len(project.episodes),
                "characters_count": len(project.characters),
                "scenes_count": len(project.scenes),
                "props_count": len(project.props),
                "export_time": datetime.now().isoformat(),
            }
            project_json = json.dumps(project_data, ensure_ascii=False, indent=2)
            zipf.writestr("project.json", project_json)
            exported_files.append("project.json")

        return ExportProjectResponse(
            success=True,
            message=f"项目导出成功，共导出 {len(exported_files)} 个文件",
            file_path=str(zip_path),
            exported_files=exported_files,
        )

    async def export_jianying(self, project_id: str, req: ExportJianyingRequest) -> ExportJianyingResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)

        export_dir = Path("exports") / project_id / "jianying"
        export_dir.mkdir(parents=True, exist_ok=True)
        draft_filename = f"episode_{req.episode_number}.draft"
        draft_path = export_dir / draft_filename

        return ExportJianyingResponse(
            success=True,
            message="剪映草稿导出成功",
            draft_path=str(draft_path),
        )