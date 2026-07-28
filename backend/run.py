import asyncio
import logging
import uvicorn
from ai_anidrama.main import app
from ai_anidrama.infrastructure.config.settings import settings
from ai_anidrama.infrastructure.persistence.sqlalchemy.engine import init_db
from ai_anidrama.infrastructure.external.providers import initialize_providers
from ai_anidrama.infrastructure.external.queue.task_worker import TaskWorker
from ai_anidrama.infrastructure.external.queue.task_queue import TaskQueue
from ai_anidrama.infrastructure.persistence.repositories.task_impl import TaskRepositoryImpl

logger = logging.getLogger(__name__)


async def main():
    await init_db()
    initialize_providers(
        credentials={"srd": settings.srd_api_key, "srd_image": settings.srd_image_api_key},
        base_urls={"srd": settings.srd_api_base_url, "srd_image": settings.srd_image_api_base_url},
    )
    task_repo = TaskRepositoryImpl()
    task_queue = TaskQueue(task_repo)
    task_worker = TaskWorker(task_queue, task_repo)
    worker_task = asyncio.create_task(task_worker.start())
    config = uvicorn.Config(app, host="0.0.0.0", port=1243)
    server = uvicorn.Server(config)
    try:
        await server.serve()
    finally:
        await task_worker.stop()
        await worker_task


if __name__ == "__main__":
    asyncio.run(main())