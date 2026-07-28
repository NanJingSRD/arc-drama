from datetime import datetime

from ai_anidrama.application.dtos.generation import (
    StoryboardGenerateRequest,
    StoryboardGenerateResponse,
    VideoGenerateRequest,
    VideoGenerateResponse,
    BatchStoryboardRequest,
    BatchStoryboardResponse,
    BatchVideoRequest,
    BatchVideoResponse,
    RegenerateStoryboardRequest,
    RegenerateStoryboardResponse,
    RegenerateVideoRequest,
    RegenerateVideoResponse,
)
from ai_anidrama.core.exceptions import ProjectNotFoundError, ScriptNotFoundError
from ai_anidrama.core.validators import validate_project_id
from ai_anidrama.domain.repositories.project import ProjectRepository
from ai_anidrama.domain.repositories.script import ScriptRepository
from ai_anidrama.domain.services.storyboard_generator import StoryboardGenerator
from ai_anidrama.infrastructure.external.queue.task_queue import TaskQueue


class GenerationService:
    def __init__(
        self,
        project_repo: ProjectRepository,
        script_repo: ScriptRepository,
        task_queue: TaskQueue,
    ):
        self.project_repo = project_repo
        self.script_repo = script_repo
        self.task_queue = task_queue

    async def generate_overview(self, project_id: str) -> StoryboardGenerateResponse:
        """生成项目概述"""
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="overview",
            media_type="text",
            resource_id="overview",
            payload={},
        )
        return StoryboardGenerateResponse(
            success=True,
            message="概述生成任务已提交",
            task_id=result["task_id"],
        )

    async def generate_episodes_plan(self, project_id: str, episodes_count: int = 0, episode_target_units: int = 1000, strategy: str = "balanced") -> StoryboardGenerateResponse:
        """AI自动规划分集"""
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="episodes_plan",
            media_type="text",
            resource_id="episodes_plan",
            payload={"episodes_count": episodes_count, "episode_target_units": episode_target_units, "strategy": strategy},
        )
        return StoryboardGenerateResponse(
            success=True,
            message="分集规划任务已提交",
            task_id=result["task_id"],
        )

    async def direct_generate_episodes(self, project_id: str, episode: int = 1, episodes_count: int = 0, episode_target_units: int = 1000, strategy: str = "balanced") -> StoryboardGenerateResponse:
        """AI直接生成多集剧本"""
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="direct_generate",
            media_type="text",
            resource_id="direct_generate",
            payload={"episode": episode, "episodes_count": episodes_count, "episode_target_units": episode_target_units, "strategy": strategy},
        )
        return StoryboardGenerateResponse(
            success=True,
            message="直接生成任务已提交",
            task_id=result["task_id"],
        )

    async def generate_episode_script(self, project_id: str, episode: int, start_pos: int = 0, end_pos: int = 5000, plan: dict = None) -> StoryboardGenerateResponse:
        """生成单集剧本"""
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="generate_script",
            media_type="text",
            resource_id=f"episode_{episode}",
            payload={"episode": episode, "start_pos": start_pos, "end_pos": end_pos, "plan": plan},
        )
        return StoryboardGenerateResponse(
            success=True,
            message=f"第{episode}集剧本生成任务已提交",
            task_id=result["task_id"],
        )

    async def generate_storyboard(self, project_id: str, req: StoryboardGenerateRequest) -> StoryboardGenerateResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        script = await self.script_repo.get_by_episode(project_id, req.episode_number)
        if not script:
            raise ScriptNotFoundError(project_id, req.episode_number)
        scene = script.get_scene(req.scene_id)
        if not scene:
            raise ValueError(f"Scene {req.scene_id} not found in episode {req.episode_number}")
        prompt = req.prompt or StoryboardGenerator.build_image_prompt(scene)
        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="storyboard",
            media_type="image",
            resource_id=f"{req.episode_number}_{req.scene_id}",
            payload={
                "episode_number": req.episode_number,
                "scene_id": req.scene_id,
                "prompt": prompt,
            },
        )
        return StoryboardGenerateResponse(
            success=True,
            message="任务已入队，正在生成分镜图",
            task_id=result["task_id"],
        )

    async def generate_storyboard_batch(self, project_id: str, req: BatchStoryboardRequest) -> BatchStoryboardResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        script = await self.script_repo.get_by_episode(project_id, req.episode_number)
        if not script:
            raise ScriptNotFoundError(project_id, req.episode_number)
        task_ids = []
        for scene_id in req.scene_ids:
            scene = script.get_scene(scene_id)
            if not scene:
                continue
            prompt = StoryboardGenerator.build_image_prompt(scene)
            result = await self.task_queue.enqueue_task(
                project_id=project_id,
                task_type="storyboard",
                media_type="image",
                resource_id=f"{req.episode_number}_{scene_id}",
                payload={
                    "episode_number": req.episode_number,
                    "scene_id": scene_id,
                    "prompt": prompt,
                },
            )
            task_ids.append(result["task_id"])
        return BatchStoryboardResponse(
            success=True,
            message=f"批量任务已入队，共 {len(task_ids)} 个分镜图生成任务",
            task_ids=task_ids,
        )

    async def regenerate_storyboard(self, project_id: str, req: RegenerateStoryboardRequest) -> RegenerateStoryboardResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        script = await self.script_repo.get_by_episode(project_id, req.episode_number)
        if not script:
            raise ScriptNotFoundError(project_id, req.episode_number)
        scene = script.get_scene(req.scene_id)
        if not scene:
            raise ValueError(f"Scene {req.scene_id} not found in episode {req.episode_number}")
        prompt = req.prompt or StoryboardGenerator.build_image_prompt(scene)
        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="storyboard",
            media_type="image",
            resource_id=f"{req.episode_number}_{req.scene_id}_regenerated",
            payload={
                "episode_number": req.episode_number,
                "scene_id": req.scene_id,
                "prompt": prompt,
                "regenerate": True,
            },
        )
        return RegenerateStoryboardResponse(
            success=True,
            message="重新生成分镜图任务已入队",
            task_id=result["task_id"],
        )

    async def generate_video(self, project_id: str, req: VideoGenerateRequest) -> VideoGenerateResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        script = await self.script_repo.get_by_episode(project_id, req.episode_number)
        if not script:
            raise ScriptNotFoundError(project_id, req.episode_number)
        scene = script.get_scene(req.scene_id)
        if not scene:
            raise ValueError(f"Scene {req.scene_id} not found in episode {req.episode_number}")
        prompt = req.prompt or StoryboardGenerator.build_video_prompt(scene)
        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="video",
            media_type="video",
            resource_id=f"{req.episode_number}_{req.scene_id}",
            payload={
                "episode_number": req.episode_number,
                "scene_id": req.scene_id,
                "prompt": prompt,
            },
        )
        return VideoGenerateResponse(
            success=True,
            message="任务已入队，正在生成视频",
            task_id=result["task_id"],
        )

    async def generate_video_batch(self, project_id: str, req: BatchVideoRequest) -> BatchVideoResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        script = await self.script_repo.get_by_episode(project_id, req.episode_number)
        if not script:
            raise ScriptNotFoundError(project_id, req.episode_number)
        task_ids = []
        for scene_id in req.scene_ids:
            scene = script.get_scene(scene_id)
            if not scene:
                continue
            prompt = StoryboardGenerator.build_video_prompt(scene)
            result = await self.task_queue.enqueue_task(
                project_id=project_id,
                task_type="video",
                media_type="video",
                resource_id=f"{req.episode_number}_{scene_id}",
                payload={
                    "episode_number": req.episode_number,
                    "scene_id": scene_id,
                    "prompt": prompt,
                },
            )
            task_ids.append(result["task_id"])
        return BatchVideoResponse(
            success=True,
            message=f"批量任务已入队，共 {len(task_ids)} 个视频生成任务",
            task_ids=task_ids,
        )

    async def regenerate_video(self, project_id: str, req: RegenerateVideoRequest) -> RegenerateVideoResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        script = await self.script_repo.get_by_episode(project_id, req.episode_number)
        if not script:
            raise ScriptNotFoundError(project_id, req.episode_number)
        scene = script.get_scene(req.scene_id)
        if not scene:
            raise ValueError(f"Scene {req.scene_id} not found in episode {req.episode_number}")
        prompt = req.prompt or StoryboardGenerator.build_video_prompt(scene)
        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="video",
            media_type="video",
            resource_id=f"{req.episode_number}_{req.scene_id}_regenerated",
            payload={
                "episode_number": req.episode_number,
                "scene_id": req.scene_id,
                "prompt": prompt,
                "regenerate": True,
            },
        )
        return RegenerateVideoResponse(
            success=True,
            message="重新生成视频任务已入队",
            task_id=result["task_id"],
        )