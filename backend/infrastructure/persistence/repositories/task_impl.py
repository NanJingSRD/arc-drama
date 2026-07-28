from datetime import datetime
from typing import Any, List, Optional
from sqlalchemy import select, update, delete

from ai_anidrama.domain.entities.task import Task
from ai_anidrama.domain.repositories.task import TaskRepository
from ai_anidrama.infrastructure.persistence.sqlalchemy.engine import get_session_maker
from ai_anidrama.infrastructure.persistence.sqlalchemy.models import TaskModel


class TaskRepositoryImpl(TaskRepository):
    async def get_by_id(self, task_id: str) -> Optional[Task]:
        async with get_session_maker()() as session:
            stmt = select(TaskModel).where(TaskModel.id == task_id)
            result = await session.execute(stmt)
            model = result.scalar_one_or_none()
            if model:
                return self._from_model(model)
        return None

    async def get_by_project(self, project_id: str) -> List[Task]:
        async with get_session_maker()() as session:
            stmt = select(TaskModel).where(TaskModel.project_id == project_id).order_by(TaskModel.created_at.desc())
            result = await session.execute(stmt)
            models = result.scalars().all()
            return [self._from_model(m) for m in models]

    async def get_by_status(self, status: str) -> List[Task]:
        async with get_session_maker()() as session:
            stmt = select(TaskModel).where(TaskModel.status == status)
            result = await session.execute(stmt)
            models = result.scalars().all()
            return [self._from_model(m) for m in models]

    async def create(self, task: Task) -> Task:
        async with get_session_maker()() as session:
            model = TaskModel(
                id=task.task_id,
                project_id=task.project_id,
                task_type=task.task_type,
                media_type=task.media_type,
                resource_id=task.resource_id,
                status=task.status,
                progress=task.progress,
                message=task.message,
                payload=task.payload,
                result=task.result,
                error=task.error,
                user_id=task.user_id,
                created_at=task.created_at,
                updated_at=task.updated_at,
            )
            session.add(model)
            await session.commit()
        return task

    async def update(self, task: Task) -> Task:
        async with get_session_maker()() as session:
            stmt = update(TaskModel).where(TaskModel.id == task.task_id).values(
                status=task.status,
                progress=task.progress,
                message=task.message,
                payload=task.payload,
                result=task.result,
                error=task.error,
                updated_at=task.updated_at,
            )
            await session.execute(stmt)
            await session.commit()
        return task

    async def delete(self, task_id: str) -> None:
        async with get_session_maker()() as session:
            stmt = delete(TaskModel).where(TaskModel.id == task_id)
            await session.execute(stmt)
            await session.commit()

    async def update_status(self, task_id: str, status: str, progress: float = 0.0) -> None:
        async with get_session_maker()() as session:
            stmt = update(TaskModel).where(TaskModel.id == task_id).values(
                status=status,
                progress=progress,
                updated_at=datetime.now(),
            )
            await session.execute(stmt)
            await session.commit()

    async def get_pending_tasks(self) -> List[Task]:
        async with get_session_maker()() as session:
            stmt = select(TaskModel).where(TaskModel.status == "pending").order_by(TaskModel.created_at)
            result = await session.execute(stmt)
            models = result.scalars().all()
            return [self._from_model(m) for m in models]

    def _from_model(self, model: TaskModel) -> Task:
        model_dict: Any = {
            "id": getattr(model, "id", ""),
            "project_id": getattr(model, "project_id", ""),
            "task_type": getattr(model, "task_type", ""),
            "media_type": getattr(model, "media_type", ""),
            "resource_id": getattr(model, "resource_id", ""),
            "status": getattr(model, "status", ""),
            "progress": getattr(model, "progress", 0.0),
            "message": getattr(model, "message", ""),
            "payload": getattr(model, "payload", {}),
            "result": getattr(model, "result", None),
            "error": getattr(model, "error", None),
            "user_id": getattr(model, "user_id", None),
            "created_at": getattr(model, "created_at", datetime.now()),
            "updated_at": getattr(model, "updated_at", datetime.now()),
        }
        result_data = None
        if model_dict["result"] is not None:
            result_data = dict(model_dict["result"])
        error_data = None
        if model_dict["error"] is not None:
            error_data = str(model_dict["error"])
        user_id_data = None
        if model_dict["user_id"] is not None:
            user_id_data = str(model_dict["user_id"])
        return Task(
            task_id=str(model_dict["id"]),
            project_id=str(model_dict["project_id"]),
            task_type=str(model_dict["task_type"]),
            media_type=str(model_dict["media_type"]),
            resource_id=str(model_dict["resource_id"]),
            status=str(model_dict["status"]),
            progress=float(model_dict["progress"]),
            message=str(model_dict["message"] or ""),
            payload=dict(model_dict["payload"]) if model_dict["payload"] else {},
            result=result_data,
            error=error_data,
            user_id=user_id_data,
            created_at=model_dict["created_at"],
            updated_at=model_dict["updated_at"],
        )