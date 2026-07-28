from ai_anidrama.core.exceptions import ProjectNotFoundError
from ai_anidrama.core.validators import validate_project_id
from ai_anidrama.domain.repositories.project import ProjectRepository
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage


class ProcessNode:
    def __init__(self, id: str, name: str, status: str, progress: float = 0.0, message: str = ""):
        self.id = id
        self.name = name
        self.status = status
        self.progress = progress
        self.message = message


class ProgressService:
    def __init__(self, project_repo: ProjectRepository):
        self.project_repo = project_repo
        self.storage = ProjectStorage()

    async def get_process_nodes(self, project_id: str):
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        nodes = []
        nodes.append(ProcessNode(
            id="create_project",
            name="创建项目",
            status="completed",
            progress=100.0,
            message=f"项目 '{project.name}' 已创建",
        ))

        source_files = self.storage.list_source_files(project_id)
        source_files_exist = len(source_files) > 0
        nodes.append(ProcessNode(
            id="upload_source",
            name="上传源文件",
            status="completed" if source_files_exist else "pending",
            progress=100.0 if source_files_exist else 0.0,
            message=f"已上传 {len(source_files)} 个源文件" if source_files_exist else "等待上传小说/剧本文件",
        ))

        outline_exists = project.description is not None and len(project.description) > 0
        nodes.append(ProcessNode(
            id="generate_outline",
            name="生成概要和世界观",
            status="completed" if outline_exists else "pending",
            progress=100.0 if outline_exists else 0.0,
            message="概要和世界观已生成" if outline_exists else "等待生成概要",
        ))

        has_episodes = len(project.episodes) > 0
        nodes.append(ProcessNode(
            id="process_script",
            name="自动处理剧本",
            status="completed" if has_episodes else "pending",
            progress=100.0 if has_episodes else 0.0,
            message=f"已生成 {len(project.episodes)} 集剧本" if has_episodes else "等待处理剧本",
        ))

        has_assets = len(project.characters) > 0 or len(project.scenes) > 0 or len(project.props) > 0
        assets_progress = 0.0
        if has_assets:
            total_assets = len(project.characters) + len(project.scenes) + len(project.props)
            assets_progress = min(100.0, total_assets * 20)
        nodes.append(ProcessNode(
            id="generate_assets",
            name="自动生成资产",
            status="completed" if has_assets and assets_progress >= 100 else "in_progress" if has_assets else "pending",
            progress=assets_progress,
            message=f"已生成 {len(project.characters)} 角色、{len(project.scenes)} 场景、{len(project.props)} 道具" if has_assets else "等待生成资产",
        ))

        storyboard_files = self.storage.list_storyboard_files(project_id)
        has_storyboards = len(storyboard_files) > 0
        nodes.append(ProcessNode(
            id="create_storyboards",
            name="分镜制作",
            status="completed" if has_storyboards else "pending",
            progress=100.0 if has_storyboards else 0.0,
            message=f"已制作 {len(storyboard_files)} 张分镜图" if has_storyboards else "等待制作分镜",
        ))

        nodes.append(ProcessNode(
            id="authorize_storyboards",
            name="分镜图授权",
            status="completed" if has_storyboards else "pending",
            progress=100.0 if has_storyboards else 0.0,
            message="分镜图已授权" if has_storyboards else "等待授权分镜图",
        ))

        video_files = self.storage.list_video_files(project_id)
        has_videos = len(video_files) > 0
        nodes.append(ProcessNode(
            id="generate_videos",
            name="生成视频",
            status="completed" if has_videos else "pending",
            progress=100.0 if has_videos else 0.0,
            message=f"已生成 {len(video_files)} 个视频" if has_videos else "等待生成视频",
        ))

        nodes.append(ProcessNode(
            id="export_video",
            name="视频导出",
            status="completed" if project.status == "completed" else "pending",
            progress=100.0 if project.status == "completed" else 0.0,
            message="项目已完成并可导出" if project.status == "completed" else "等待导出视频",
        ))

        return nodes

    async def get_project_progress(self, project_id: str):
        validate_project_id(project_id)
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        nodes = await self.get_process_nodes(project_id)
        overall_progress = sum(node.progress for node in nodes) / len(nodes)

        return {
            "project_id": project_id,
            "project_name": project.name,
            "overall_progress": round(overall_progress, 2),
            "project_status": project.status,
            "nodes": [node.__dict__ for node in nodes],
        }

    async def get_current_step(self, project_id: str):
        validate_project_id(project_id)
        nodes = await self.get_process_nodes(project_id)

        for node in nodes:
            if node.status == "pending":
                return {
                    "current_step": node.id,
                    "step_name": node.name,
                    "message": node.message,
                }

        return {
            "current_step": "completed",
            "step_name": "已完成",
            "message": "所有步骤已完成",
        }