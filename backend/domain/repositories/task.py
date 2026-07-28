from typing import List, Optional, Protocol

from ai_anidrama.domain.entities.task import Task

class TaskRepository(Protocol):
    async def get_by_id(self, task_id: str) -> Optional[Task]:
        ...

    async def get_by_project(self, project_id: str) -> List[Task]:
        ...

    async def get_by_status(self, status: str) -> List[Task]:
        ...

    async def create(self, task: Task) -> Task:
        ...

    async def update(self, task: Task) -> Task:
        ...

    async def delete(self, task_id: str) -> None:
        ...

    async def update_status(self, task_id: str, status: str, progress: float = 0.0) -> None:
        ...

    async def get_pending_tasks(self) -> List[Task]:
        ...
