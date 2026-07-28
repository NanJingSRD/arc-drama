import asyncio
from datetime import datetime
from typing import Dict, List, Optional

from ai_anidrama.core.utils import generate_task_id
from ai_anidrama.domain.entities.task import Task
from ai_anidrama.domain.repositories.task import TaskRepository


class TaskQueue:
    def __init__(self, task_repo: TaskRepository):
        self.task_repo = task_repo
        self._lock = asyncio.Lock()
        self._listeners: List[asyncio.Queue] = []

    async def enqueue_task(
        self,
        project_id: str,
        task_type: str,
        media_type: str,
        resource_id: str,
        payload: Dict = {},
        user_id: Optional[str] = None,
    ) -> Dict[str, str]:
        task_id = generate_task_id()
        now = datetime.now()
        task = Task(
            task_id=task_id,
            project_id=project_id,
            task_type=task_type,
            media_type=media_type,
            resource_id=resource_id,
            status="pending",
            progress=0.0,
            message="任务已入队",
            payload=payload,
            user_id=user_id,
            created_at=now,
            updated_at=now,
        )
        await self.task_repo.create(task)

        await self._notify_listeners({
            "event_type": "task_queued",
            "task_id": task_id,
            "project_id": project_id,
            "task_type": task_type,
            "timestamp": now.isoformat(),
        })

        return {"task_id": task_id}

    async def update_task_status(
        self,
        task_id: str,
        status: str,
        progress: float = 0.0,
        message: str = "",
    ) -> None:
        task = await self.task_repo.get_by_id(task_id)
        if task:
            task.set_status(status, progress, message)
            await self.task_repo.update(task)

            await self._notify_listeners({
                "event_type": "task_updated",
                "task_id": task_id,
                "status": status,
                "progress": progress,
                "message": message,
                "timestamp": datetime.now().isoformat(),
            })

    async def complete_task(self, task_id: str, result: Dict) -> None:
        task = await self.task_repo.get_by_id(task_id)
        if task:
            task.set_result(result)
            await self.task_repo.update(task)

            await self._notify_listeners({
                "event_type": "task_completed",
                "task_id": task_id,
                "result": result,
                "timestamp": datetime.now().isoformat(),
            })

    async def fail_task(self, task_id: str, error: str) -> None:
        task = await self.task_repo.get_by_id(task_id)
        if task:
            task.set_error(error)
            await self.task_repo.update(task)

            await self._notify_listeners({
                "event_type": "task_failed",
                "task_id": task_id,
                "error": error,
                "timestamp": datetime.now().isoformat(),
            })

    async def cancel_task(self, task_id: str) -> None:
        """取消任务"""
        await self.fail_task(task_id, "任务已取消")

    async def get_pending_tasks(self) -> List[Task]:
        return await self.task_repo.get_pending_tasks()

    async def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._listeners.append(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        if queue in self._listeners:
            self._listeners.remove(queue)

    async def _notify_listeners(self, event: Dict) -> None:
        for listener in self._listeners[:]:
            try:
                await listener.put(event)
            except asyncio.QueueFull:
                pass