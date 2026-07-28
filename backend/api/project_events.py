"""
SSE stream for project data changes inside the workspace.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.sse import EventSourceResponse, ServerSentEvent

from ai_anidrama.api.auth import CurrentUser, CurrentUserFlexible
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

logger = logging.getLogger(__name__)

router = APIRouter()

PROJECT_EVENTS_SSE_POLL_SECONDS = 1.0

pm = ProjectStorage()


@router.get(
    "/projects/{project_name}/events/stream",
    response_class=EventSourceResponse,
)
async def stream_project_events(
    project_name: str,
    request: Request,
    _user: CurrentUserFlexible,
) -> AsyncIterator[ServerSentEvent]:
    try:
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(PROJECT_EVENTS_SSE_POLL_SECONDS)
            yield ServerSentEvent(event="heartbeat", data="{}")
    except FileNotFoundError:
        logger.info("项目在订阅前被删除，关闭事件流: %s", project_name)
        return