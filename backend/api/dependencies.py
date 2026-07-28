from typing import Annotated

from fastapi import Depends

from ai_anidrama.application.services.project import ProjectService
from ai_anidrama.application.services.script import ScriptService
from ai_anidrama.application.services.asset import AssetService
from ai_anidrama.application.services.generation import GenerationService
from ai_anidrama.application.services.task import TaskService
from ai_anidrama.application.services.provider import ProviderService
from ai_anidrama.application.services.storyboard import StoryboardService
from ai_anidrama.application.services.export import ExportService
from ai_anidrama.application.services.progress import ProgressService
from ai_anidrama.application.services.api_key import ApiKeyService
from ai_anidrama.infrastructure.external.queue.task_queue import TaskQueue
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage
from ai_anidrama.infrastructure.persistence.repositories.project_impl import ProjectRepositoryImpl
from ai_anidrama.infrastructure.persistence.repositories.script_impl import ScriptRepositoryImpl
from ai_anidrama.infrastructure.persistence.repositories.task_impl import TaskRepositoryImpl
from ai_anidrama.infrastructure.persistence.repositories.api_key_impl import ApiKeyRepositoryImpl


def get_project_storage() -> ProjectStorage:
    return ProjectStorage()


def get_project_repo(storage: Annotated[ProjectStorage, Depends(get_project_storage)]) -> ProjectRepositoryImpl:
    return ProjectRepositoryImpl(storage)


def get_script_repo(storage: Annotated[ProjectStorage, Depends(get_project_storage)]) -> ScriptRepositoryImpl:
    return ScriptRepositoryImpl(storage)


def get_task_repo() -> TaskRepositoryImpl:
    return TaskRepositoryImpl()


def get_api_key_repo() -> ApiKeyRepositoryImpl:
    return ApiKeyRepositoryImpl()


def get_task_queue(task_repo: Annotated[TaskRepositoryImpl, Depends(get_task_repo)]) -> TaskQueue:
    return TaskQueue(task_repo)


def get_project_service(
    project_repo: Annotated[ProjectRepositoryImpl, Depends(get_project_repo)],
) -> ProjectService:
    return ProjectService(project_repo)


def get_script_service(
    project_repo: Annotated[ProjectRepositoryImpl, Depends(get_project_repo)],
    script_repo: Annotated[ScriptRepositoryImpl, Depends(get_script_repo)],
    storage: Annotated[ProjectStorage, Depends(get_project_storage)],
    task_queue: Annotated[TaskQueue, Depends(get_task_queue)],
) -> ScriptService:
    return ScriptService(project_repo, script_repo, storage, task_queue)


def get_asset_service(
    project_repo: Annotated[ProjectRepositoryImpl, Depends(get_project_repo)],
    task_queue: Annotated[TaskQueue, Depends(get_task_queue)],
) -> AssetService:
    return AssetService(project_repo, task_queue)


def get_generation_service(
    project_repo: Annotated[ProjectRepositoryImpl, Depends(get_project_repo)],
    script_repo: Annotated[ScriptRepositoryImpl, Depends(get_script_repo)],
    task_queue: Annotated[TaskQueue, Depends(get_task_queue)],
) -> GenerationService:
    return GenerationService(project_repo, script_repo, task_queue)


def get_task_service(
    task_repo: Annotated[TaskRepositoryImpl, Depends(get_task_repo)],
    task_queue: Annotated[TaskQueue, Depends(get_task_queue)],
) -> TaskService:
    return TaskService(task_repo, task_queue)


def get_provider_service() -> ProviderService:
    return ProviderService()


def get_storyboard_service() -> StoryboardService:
    return StoryboardService()


def get_export_service(
    project_repo: Annotated[ProjectRepositoryImpl, Depends(get_project_repo)],
    script_repo: Annotated[ScriptRepositoryImpl, Depends(get_script_repo)],
) -> ExportService:
    return ExportService(project_repo, script_repo)


def get_progress_service(
    project_repo: Annotated[ProjectRepositoryImpl, Depends(get_project_repo)],
) -> ProgressService:
    return ProgressService(project_repo)


def get_api_key_service(
    api_key_repo: Annotated[ApiKeyRepositoryImpl, Depends(get_api_key_repo)],
) -> ApiKeyService:
    return ApiKeyService(api_key_repo)


ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]
ScriptServiceDep = Annotated[ScriptService, Depends(get_script_service)]
AssetServiceDep = Annotated[AssetService, Depends(get_asset_service)]
GenerationServiceDep = Annotated[GenerationService, Depends(get_generation_service)]
TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]
TaskQueueDep = Annotated[TaskQueue, Depends(get_task_queue)]
ProviderServiceDep = Annotated[ProviderService, Depends(get_provider_service)]
StoryboardServiceDep = Annotated[StoryboardService, Depends(get_storyboard_service)]
ExportServiceDep = Annotated[ExportService, Depends(get_export_service)]
ProgressServiceDep = Annotated[ProgressService, Depends(get_progress_service)]
ApiKeyServiceDep = Annotated[ApiKeyService, Depends(get_api_key_service)]