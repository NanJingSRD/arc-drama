import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from ai_anidrama.api import (
    projects,
    tasks,
    files,
    auth,
    assets,
    api_keys,
    auto_assets,
    characters,
    cost_estimation,
    custom_providers,
    direct_episode,
    generate,
    grids,
    products,
    project_events,
    providers,
    props,
    reference_videos,
    scenes,
    shot_uploads,
    system,
    system_config,
    usage,
    versions,
)
from ai_anidrama.infrastructure.config.settings import settings
from ai_anidrama.core.logging import setup_logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("AIAniDrama service starting up...")
    from ai_anidrama.infrastructure.persistence.sqlalchemy.engine import init_db
    await init_db()
    logger.info("Database tables initialized")
    yield
    logger.info("AIAniDrama service shutting down...")

def create_app() -> FastAPI:
    app = FastAPI(
        title="AIAniDrama API",
        description="AI Anime Drama Generation Platform API",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
    app.include_router(projects.router, prefix="/api/v1", tags=["projects"])
    app.include_router(assets.router, prefix="/api/v1", tags=["assets"])
    app.include_router(tasks.router, prefix="/api/v1", tags=["tasks"])
    app.include_router(files.router, prefix="/api/v1", tags=["files"])
    app.include_router(api_keys.router, prefix="/api/v1", tags=["api_keys"])
    app.include_router(auto_assets.router, prefix="/api/v1", tags=["auto_assets"])
    app.include_router(characters.router, prefix="/api/v1", tags=["characters"])
    app.include_router(cost_estimation.router, prefix="/api/v1", tags=["cost_estimation"])
    app.include_router(custom_providers.router, prefix="/api/v1", tags=["custom_providers"])
    app.include_router(direct_episode.router, prefix="/api/v1", tags=["direct_episode"])
    app.include_router(generate.router, prefix="/api/v1", tags=["generate"])
    app.include_router(grids.router, prefix="/api/v1", tags=["grids"])
    app.include_router(products.router, prefix="/api/v1", tags=["products"])
    app.include_router(project_events.router, prefix="/api/v1", tags=["project_events"])
    app.include_router(providers.router, prefix="/api/v1", tags=["providers"])
    app.include_router(props.router, prefix="/api/v1", tags=["props"])
    app.include_router(reference_videos.router, prefix="/api/v1", tags=["reference_videos"])
    app.include_router(scenes.router, prefix="/api/v1", tags=["scenes"])
    app.include_router(shot_uploads.router, prefix="/api/v1", tags=["shot_uploads"])
    app.include_router(system.router, prefix="/api/v1", tags=["system"])
    app.include_router(system_config.router, prefix="/api/v1", tags=["system_config"])
    app.include_router(usage.router, prefix="/api/v1", tags=["usage"])
    app.include_router(versions.router, prefix="/api/v1", tags=["versions"])

    app.mount("/static", StaticFiles(directory=settings.static_dir), name="static")

    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": "1.0.0"}

    return app

app = create_app()