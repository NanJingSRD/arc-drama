import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

router = APIRouter()

pm = ProjectStorage()

def get_project_manager() -> ProjectStorage:
    return pm

def _resolve_script_file(episode: int | None, script_file: str | None) -> str:
    if script_file:
        return script_file
    if episode:
        return f"scripts/episode_{episode}.json"
    raise HTTPException(status_code=400, detail="必须传入 episode 或 script_file")

class GenerateStoryboardRequest(BaseModel):
    prompt: str | dict
    script_file: str | None = None
    episode: int | None = None

class GenerateVideoRequest(BaseModel):
    prompt: str | dict
    script_file: str | None = None
    episode: int | None = None
    duration_seconds: int | None = None
    seed: int | None = None

class BatchGenerateStoryboardRequest(BaseModel):
    script_file: str | None = None
    episode: int | None = None
    segment_ids: list[str] | None = None

class BatchGenerateVideoRequest(BaseModel):
    script_file: str | None = None
    episode: int | None = None
    segment_ids: list[str] | None = None
    duration_seconds: int | None = None
    seed: int | None = None

class GenerateTtsRequest(BaseModel):
    script_file: str

class GenerateCharacterRequest(BaseModel):
    prompt: str | None = None

class GenerateSceneRequest(BaseModel):
    prompt: str | None = None

class GeneratePropRequest(BaseModel):
    prompt: str | None = None

class GenerateProductRequest(BaseModel):
    prompt: str | None = None

class BatchGenerateRequest(BaseModel):
    names: list[str] | None = None

@router.post("/projects/{project_id}/generate/storyboard/{segment_id}", summary="生成分镜图")
async def generate_storyboard(
    project_id: str,
    segment_id: str,
    req: GenerateStoryboardRequest,
    _user: CurrentUser,
):
    try:
        script_file = _resolve_script_file(req.episode, req.script_file)

        def _sync():
            project = get_project_manager().load_project(project_id)
            return project

        project = await asyncio.to_thread(_sync)

        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="storyboard",
            media_type="image",
            resource_id=segment_id,
            script_file=script_file,
            payload={"prompt": req.prompt},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"分镜图任务已提交: {segment_id}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/regenerate/storyboard/{segment_id}", summary="重新生成分镜图")
async def regenerate_storyboard(
    project_id: str,
    segment_id: str,
    req: GenerateStoryboardRequest,
    _user: CurrentUser,
):
    try:
        script_file = _resolve_script_file(req.episode, req.script_file)

        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="storyboard",
            media_type="image",
            resource_id=segment_id,
            script_file=script_file,
            payload={"prompt": req.prompt},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"分镜图任务已提交: {segment_id}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/storyboard-batch", summary="批量生成分镜图")
async def generate_storyboard_batch(
    project_id: str,
    req: BatchGenerateStoryboardRequest,
    _user: CurrentUser,
):
    try:
        script_file = _resolve_script_file(req.episode, req.script_file)

        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()

        submitted = []
        skipped = []

        try:
            project = get_project_manager().load_project(project_id)
            script = get_project_manager().load_script(project_id, script_file)
            items = script.get("scenes", [])
            target_segment_ids = req.segment_ids or [item.get("scene_id") for item in items if isinstance(item, dict) and item.get("scene_id")]
        except Exception:
            target_segment_ids = []

        for segment_id in target_segment_ids:
            if not segment_id:
                continue
            try:
                result = await queue.enqueue_task(
                    project_name=project_id,
                    task_type="storyboard",
                    media_type="image",
                    resource_id=segment_id,
                    script_file=script_file,
                    payload={"prompt": ""},
                    user_id=_user.id,
                )
                submitted.append({"name": segment_id, "task_id": result["task_id"]})
            except Exception as e:
                skipped.append({"name": segment_id, "reason": str(e)})

        return {
            "success": len(skipped) == 0,
            "message": f"已提交 {len(submitted)} 个任务",
            "submitted": submitted,
            "skipped": skipped,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/video/{segment_id}", summary="生成视频")
async def generate_video(
    project_id: str,
    segment_id: str,
    req: GenerateVideoRequest,
    _user: CurrentUser,
):
    try:
        script_file = _resolve_script_file(req.episode, req.script_file)

        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="video",
            media_type="video",
            resource_id=segment_id,
            script_file=script_file,
            payload={"prompt": req.prompt, "duration_seconds": req.duration_seconds, "seed": req.seed},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"视频生成任务已提交: {segment_id}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/regenerate/video/{segment_id}", summary="重新生成视频")
async def regenerate_video(
    project_id: str,
    segment_id: str,
    req: GenerateVideoRequest,
    _user: CurrentUser,
):
    try:
        script_file = _resolve_script_file(req.episode, req.script_file)

        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="video",
            media_type="video",
            resource_id=segment_id,
            script_file=script_file,
            payload={"prompt": req.prompt, "duration_seconds": req.duration_seconds, "seed": req.seed},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"视频生成任务已提交: {segment_id}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/video-batch", summary="批量生成视频")
async def generate_video_batch(
    project_id: str,
    req: BatchGenerateVideoRequest,
    _user: CurrentUser,
):
    try:
        script_file = _resolve_script_file(req.episode, req.script_file)

        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()

        submitted = []
        skipped = []

        try:
            project = get_project_manager().load_project(project_id)
            script = get_project_manager().load_script(project_id, script_file)
            items = script.get("scenes", [])
            target_segment_ids = req.segment_ids or [item.get("scene_id") for item in items if isinstance(item, dict) and item.get("scene_id")]
        except Exception:
            target_segment_ids = []

        for segment_id in target_segment_ids:
            if not segment_id:
                continue
            try:
                result = await queue.enqueue_task(
                    project_name=project_id,
                    task_type="video",
                    media_type="video",
                    resource_id=segment_id,
                    script_file=script_file,
                    payload={"prompt": "", "duration_seconds": req.duration_seconds, "seed": req.seed},
                    user_id=_user.id,
                )
                submitted.append({"name": segment_id, "task_id": result["task_id"]})
            except Exception as e:
                skipped.append({"name": segment_id, "reason": str(e)})

        return {
            "success": len(skipped) == 0,
            "message": f"已提交 {len(submitted)} 个任务",
            "submitted": submitted,
            "skipped": skipped,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/tts/{segment_id}", summary="生成旁白配音")
async def generate_tts(
    project_id: str,
    segment_id: str,
    req: GenerateTtsRequest,
    _user: CurrentUser,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="tts",
            media_type="audio",
            resource_id=segment_id,
            script_file=req.script_file,
            payload={},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"旁白配音任务已提交: {segment_id}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/tts", summary="批量生成旁白配音")
async def generate_tts_batch(
    project_id: str,
    req: GenerateTtsRequest,
    _user: CurrentUser,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()

        task_ids: list[str] = []
        try:
            script = get_project_manager().load_script(project_id, req.script_file)
            items = script.get("segments", [])
            for item in items:
                seg_id = item.get("segment_id")
                if seg_id:
                    result = await queue.enqueue_task(
                        project_name=project_id,
                        task_type="tts",
                        media_type="audio",
                        resource_id=seg_id,
                        script_file=req.script_file,
                        payload={},
                        user_id=_user.id,
                    )
                    task_ids.append(result["task_id"])
        except Exception as e:
            pass

        return {"success": True, "task_ids": task_ids, "message": f"已提交 {len(task_ids)} 个旁白配音任务"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/character/{char_name:path}", summary="生成角色图")
async def generate_character(
    project_id: str,
    char_name: str,
    *,
    req: GenerateCharacterRequest | None = None,
    _user: CurrentUser,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="character",
            media_type="image",
            resource_id=char_name,
            payload={"prompt": req.prompt if req else None},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"角色图任务已提交: {char_name}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/scene/{scene_name:path}", summary="生成场景图")
async def generate_scene(
    project_id: str,
    scene_name: str,
    *,
    req: GenerateSceneRequest | None = None,
    _user: CurrentUser,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="scene",
            media_type="image",
            resource_id=scene_name,
            payload={"prompt": req.prompt if req else None},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"场景图任务已提交: {scene_name}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/prop/{prop_name:path}", summary="生成道具图")
async def generate_prop(
    project_id: str,
    prop_name: str,
    *,
    req: GeneratePropRequest | None = None,
    _user: CurrentUser,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="prop",
            media_type="image",
            resource_id=prop_name,
            payload={"prompt": req.prompt if req else None},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"道具图任务已提交: {prop_name}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/product/{product_name:path}", summary="生成产品图")
async def generate_product(
    project_id: str,
    product_name: str,
    *,
    req: GenerateProductRequest | None = None,
    _user: CurrentUser,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()
        result = await queue.enqueue_task(
            project_name=project_id,
            task_type="product",
            media_type="image",
            resource_id=product_name,
            payload={"prompt": req.prompt if req else None},
            user_id=_user.id,
        )

        return {
            "success": True,
            "task_id": result["task_id"],
            "message": f"产品图任务已提交: {product_name}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/character-batch", summary="批量生成角色图")
async def generate_character_batch(
    project_id: str,
    _user: CurrentUser,
    req: BatchGenerateRequest | None = None,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()

        submitted = []
        skipped = []

        try:
            project = get_project_manager().load_project(project_id)
            characters = project.get("characters", {})
            names_to_generate = req.names if req else list(characters.keys())

            for name in names_to_generate:
                if name not in characters:
                    skipped.append(name)
                    continue
                try:
                    result = await queue.enqueue_task(
                        project_name=project_id,
                        task_type="character",
                        media_type="image",
                        resource_id=name,
                        payload={"prompt": characters[name].get("description", "")},
                        user_id=_user.id,
                    )
                    submitted.append({"name": name, "task_id": result["task_id"]})
                except Exception as e:
                    skipped.append(name)
        except Exception:
            pass

        return {
            "success": True,
            "message": f"已提交 {len(submitted)} 个任务",
            "submitted": submitted,
            "skipped": skipped,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/scene-batch", summary="批量生成场景图")
async def generate_scene_batch(
    project_id: str,
    _user: CurrentUser,
    req: BatchGenerateRequest | None = None,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()

        submitted = []
        skipped = []

        try:
            project = get_project_manager().load_project(project_id)
            scenes = project.get("scenes", {})
            names_to_generate = req.names if req else list(scenes.keys())

            for name in names_to_generate:
                if name not in scenes:
                    skipped.append(name)
                    continue
                try:
                    result = await queue.enqueue_task(
                        project_name=project_id,
                        task_type="scene",
                        media_type="image",
                        resource_id=name,
                        payload={"prompt": scenes[name].get("description", "")},
                        user_id=_user.id,
                    )
                    submitted.append({"name": name, "task_id": result["task_id"]})
                except Exception as e:
                    skipped.append(name)
        except Exception:
            pass

        return {
            "success": True,
            "message": f"已提交 {len(submitted)} 个任务",
            "submitted": submitted,
            "skipped": skipped,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")

@router.post("/projects/{project_id}/generate/prop-batch", summary="批量生成道具图")
async def generate_prop_batch(
    project_id: str,
    _user: CurrentUser,
    req: BatchGenerateRequest | None = None,
):
    try:
        from ai_anidrama.infrastructure.external.queue.task_queue import get_generation_queue
        queue = get_generation_queue()

        submitted = []
        skipped = []

        try:
            project = get_project_manager().load_project(project_id)
            props = project.get("props", {})
            names_to_generate = req.names if req else list(props.keys())

            for name in names_to_generate:
                if name not in props:
                    skipped.append(name)
                    continue
                try:
                    result = await queue.enqueue_task(
                        project_name=project_id,
                        task_type="prop",
                        media_type="image",
                        resource_id=name,
                        payload={"prompt": props[name].get("description", "")},
                        user_id=_user.id,
                    )
                    submitted.append({"name": name, "task_id": result["task_id"]})
                except Exception as e:
                    skipped.append(name)
        except Exception:
            pass

        return {
            "success": True,
            "message": f"已提交 {len(submitted)} 个任务",
            "submitted": submitted,
            "skipped": skipped,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")