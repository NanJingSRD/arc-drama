from typing import Any
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base

from ai_anidrama.infrastructure.config.settings import settings

Base = declarative_base()
_engine: Any = None
_session_maker: Any = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            echo=False,
            future=True,
        )
    return _engine


def get_session_maker():
    global _session_maker
    if _session_maker is None:
        from sqlalchemy.orm import sessionmaker
        _session_maker = sessionmaker(  # type: ignore[call-arg,arg-type]
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_maker


async def get_session():
    async with get_session_maker()() as session:
        yield session


get_async_session = get_session


async def init_db():
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)