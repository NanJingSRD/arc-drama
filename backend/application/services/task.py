from typing import List, Optional

from ai_anidrama.application.dtos.generation import TaskResponse, TaskListResponse
from ai_anidrama.core.exceptions import ValidationError
from ai_anidrama.domain.repositories.task import TaskRepository
from ai_anidrama.infrastructure.external.queue.task_queue import TaskQueue


class TaskService:
    def __init__(self, task_repo: TaskRepository, task_queue: TaskQueue):
        self.task_repo = task_repo
        self.task_queue = task_queue

    async def get_task(self, task_id: str) -> TaskResponse:
        if not task_id:
            raise ValidationError("Task ID cannot be empty")
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")
        return self._to_response(task)

    async def list_tasks(self, project_id: Optional[str] = None, status: Optional[str] = None) -> TaskListResponse:
        if project_id:
            tasks = await self.task_repo.get_by_project(project_id)
        elif status:
            tasks = await self.task_repo.get_by_status(status)
        else:
            tasks = await self.task_repo.get_by_status("pending")
        responses = [self._to_response(t) for t in tasks]
        return TaskListResponse(tasks=responses, total=len(responses))

    async def update_task_status(self, task_id: str, status: str, progress: float = 0.0, message: str = "") -> None:
        valid_statuses = ["pending", "processing", "completed", "failed"]
        if status not in valid_statuses:
            raise ValidationError(f"Invalid status: {status}. Valid statuses: {valid_statuses}")
        await self.task_queue.update_task_status(task_id, status, progress, message)

    async def complete_task(self, task_id: str, result: dict) -> None:
        await self.task_queue.complete_task(task_id, result)

    async def fail_task(self, task_id: str, error: str) -> None:
        await self.task_queue.fail_task(task_id, error)

    async def cancel_all_tasks(self, project_id: str) -> int:
        """取消项目的所有任务，返回取消的任务数"""
        tasks = await self.task_repo.get_by_project(project_id)
        cancelled = 0
        for task in tasks:
            if task.status in ("pending", "processing"):
                await self.task_queue.cancel_task(task.task_id)
                cancelled += 1
        return cancelled

    # 前端使用的状态值与后端存储值的映射
    STATUS_TO_FRONTEND = {
        "pending": "queued",
        "processing": "running",
        "completed": "succeeded",
        "failed": "failed",
        "cancelled": "cancelled",
    }

    def _to_response(self, task) -> TaskResponse:
        # 从payload中提取script_file
        script_file = None
        if task.payload and isinstance(task.payload, dict):
            script_file = task.payload.get("script_file")

        # 状态映射到前端期望值
        frontend_status = self.STATUS_TO_FRONTEND.get(task.status, task.status)

        created_at_str = task.created_at.isoformat() if hasattr(task.created_at, 'isoformat') else str(task.created_at) if task.created_at else None
        updated_at_str = task.updated_at.isoformat() if hasattr(task.updated_at, 'isoformat') else str(task.updated_at) if task.updated_at else None

        return TaskResponse(
            task_id=task.task_id,
            project_id=task.project_id,
            project_name=task.project_id,  # 前端使用 project_name
            task_type=task.task_type,
            media_type=task.media_type,
            resource_id=task.resource_id,
            script_file=script_file,
            status=frontend_status,
            progress=task.progress,
            message=task.message,
            payload=task.payload or {},
            result=task.result,
            error=task.error,
            error_message=task.error,  # 前端使用 error_message
            cancelled_by=None,
            provider_id=None,
            provider_job_id=None,
            source="webui",
            queued_at=created_at_str,
            started_at=created_at_str if frontend_status in ("running", "succeeded", "failed") else None,
            finished_at=updated_at_str if frontend_status in ("succeeded", "failed") else None,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )