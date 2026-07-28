"""
项目管理路由

处理项目的 CRUD 操作，复用 lib/project_manager.py
"""

import asyncio
import json
import logging
import math
import os
import shutil
import tempfile
from collections.abc import Callable
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi import Path as FastAPIPath
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.background import BackgroundTask

logger = logging.getLogger(__name__)

from ai_anidrama.api.auth import create_download_token, is_auth_enabled, require_current_user, verify_download_token
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

router = APIRouter()

_ = lambda x: x

EPISODE_PERSIST_FIELDS = {"script_file", "generation_mode"}


def get_project_storage() -> ProjectStorage:
    return ProjectStorage()


def _check_project_ownership(storage: ProjectStorage, project_name: str, user_sub: str, user_role: str = "admin", auth_enabled: bool = False) -> None:
    if not auth_enabled:
        return
    try:
        project = storage.load_project(project_name)
        project_owner = project.get("owner")
        if project_owner is None:
            if user_role != "admin":
                raise HTTPException(status_code=403, detail="project_access_denied")
        elif project_owner != user_sub:
            raise HTTPException(status_code=403, detail="project_access_denied")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")


class CreateProjectRequest(BaseModel):
    name: str | None = None
    title: str | None = None
    style: str | None = ""
    content_mode: str | None = "narration"
    source_kind: str | None = None
    aspect_ratio: str | None = "9:16"
    default_duration: int | None = None
    target_duration: int | None = Field(default=None, gt=0)
    brief: str | None = None
    generation_mode: str | None = None
    style_template_id: str | None = None
    video_backend: str | None = None
    image_backend: str | None = None
    image_provider_t2i: str | None = None
    image_provider_i2i: str | None = None
    text_backend_script: str | None = None
    text_backend_overview: str | None = None
    text_backend_style: str | None = None
    model_settings: dict[str, dict[str, str | None]] | None = None


class EpisodePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    episode: int
    script_file: str | None = None
    generation_mode: Literal["storyboard", "grid", "reference_video"] | None = None


class UpdateProjectRequest(BaseModel):
    title: str | None = None
    style: str | None = None
    content_mode: str | None = None
    source_kind: str | None = None
    aspect_ratio: str | None = None
    default_duration: int | None = None
    target_duration: int | None = Field(default=None, gt=0)
    brief: str | None = None
    generation_mode: str | None = None
    video_backend: str | None = None
    image_backend: str | None = None
    image_provider_t2i: str | None = None
    image_provider_i2i: str | None = None
    video_generate_audio: bool | None = None
    audio_backend: str | None = None
    narration_voice: str | None = None
    narration_speed: float | None = None
    text_backend_script: str | None = None
    text_backend_overview: str | None = None
    text_backend_style: str | None = None
    style_template_id: str | None = None
    clear_style_image: bool | None = None
    episodes: list[EpisodePatch] | None = None
    model_settings: dict[str, dict[str, str | None]] | None = None


def _cleanup_temp_file(path: str) -> None:
    try:
        os.unlink(path)
    except FileNotFoundError:
        return


def _cleanup_temp_dir(dir_path: str) -> None:
    shutil.rmtree(dir_path, ignore_errors=True)


@router.post("/projects/{name}/export/token")
async def create_export_token(
    name: str,
    scope: str = Query("full"),
):
    current_user = await require_current_user()
    try:
        if scope not in ("full", "current"):
            raise HTTPException(status_code=422, detail="scope_invalid")

        storage = get_project_storage()
        if not storage.project_exists(name):
            raise HTTPException(status_code=404, detail=f"project_not_found: {name}")

        download_token = create_download_token(current_user.sub, name)
        return {
            "download_token": download_token,
            "expires_in": 300,
            "diagnostics": {},
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{name}/export")
async def export_project_archive(
    name: str,
    download_token: str = Query(...),
    scope: str = Query("full"),
):
    if scope not in ("full", "current"):
        raise HTTPException(status_code=422, detail="scope_invalid")

    import jwt as pyjwt

    try:
        verify_download_token(download_token, name)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="download_expired")
    except ValueError:
        raise HTTPException(status_code=403, detail="download_token_mismatch")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="download_token_invalid")

    storage = get_project_storage()
    try:
        project_path = storage.get_project_path(name)
        temp_dir = tempfile.mkdtemp(prefix="arcreel-export-")
        import zipfile
        zip_path = os.path.join(temp_dir, f"{name}.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(project_path):
                for f in files:
                    full_path = os.path.join(root, f)
                    arcname = os.path.relpath(full_path, project_path)
                    zf.write(full_path, arcname)

        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=f"{name}.zip",
            background=BackgroundTask(_cleanup_temp_dir, temp_dir),
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{name}/export/merged-video")
async def export_merged_video(
    name: str,
    episode: int = Query(..., description="集数编号"),
    download_token: str = Query(..., description="下载 token"),
):
    import jwt as pyjwt

    try:
        verify_download_token(download_token, name)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="download_expired")
    except ValueError:
        raise HTTPException(status_code=403, detail="download_token_mismatch")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="download_token_invalid")

    raise HTTPException(status_code=500, detail="视频合成功能尚未实现")


@router.get("/projects")
async def list_projects():
    current_user = await require_current_user()
    storage = get_project_storage()
    projects = []

    for name in storage.list_projects():
        try:
            if storage.project_exists(name):
                project = storage.load_project(name)
                raw_title = project.get("title")
                projects.append(
                    {
                        "name": name,
                        "title": raw_title if isinstance(raw_title, str) else "",
                        "style": project.get("style", ""),
                        "style_template_id": project.get("style_template_id"),
                        "style_image": project.get("style_image"),
                        "thumbnail": project.get("thumbnail"),
                        "status": {},
                    }
                )
            else:
                projects.append(
                    {
                        "name": name,
                        "title": "",
                        "style": "",
                        "thumbnail": None,
                        "status": {},
                    }
                )
        except Exception as e:
            logger.warning("加载项目 '%s' 元数据失败: %s", name, e)
            projects.append(
                {"name": name, "title": "", "style": "", "thumbnail": None, "status": {}, "error": str(e)}
            )

    return {"projects": projects}


@router.post("/projects")
async def create_project(req: CreateProjectRequest):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        title = (req.title or "").strip()
        manual_name = (req.name or "").strip()
        if not title and not manual_name:
            raise HTTPException(status_code=400, detail="title_required")

        project_name = manual_name or storage.generate_project_name(title)

        if storage.project_exists(project_name):
            raise HTTPException(status_code=400, detail=f"project_exists: {project_name}")

        storage.create_project(project_name, content_mode=req.content_mode or "narration")

        extras = {}
        for field in (
            "video_backend",
            "image_provider_t2i",
            "image_provider_i2i",
            "text_backend_script",
            "text_backend_overview",
            "text_backend_style",
        ):
            value = getattr(req, field)
            if value:
                extras[field] = value

        if req.model_settings is not None:
            extras["model_settings"] = req.model_settings
        if req.generation_mode is not None:
            extras["generation_mode"] = req.generation_mode

        project = storage.update_project_metadata(
            project_name,
            title or manual_name,
            req.style or "",
            req.content_mode,
            aspect_ratio=req.aspect_ratio,
            default_duration=req.default_duration,
            style_template_id=req.style_template_id,
            extras=extras or None,
            target_duration=req.target_duration,
            brief=req.brief,
            source_kind=req.source_kind,
            owner=current_user.sub,
        )

        return {"success": True, "name": project_name, "project": project}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{name}")
async def get_project(name: str):
    current_user = await require_current_user()
    storage = get_project_storage()
    try:
        if not storage.project_exists(name):
            raise HTTPException(status_code=404, detail=f"project_not_found: {name}")

        project = storage.load_project(name)

        scripts = {}
        for ep in project.get("episodes", []):
            script_file = ep.get("script_file", "")
            if script_file:
                try:
                    script = storage.load_script(name, script_file)
                    key = (
                        script_file.replace("scripts/", "", 1)
                        if script_file.startswith("scripts/")
                        else script_file
                    )
                    scripts[key] = script
                except FileNotFoundError:
                    logger.debug("剧本文件不存在，跳过: %s/%s", name, script_file)

        asset_fingerprints = {}
        project_path = storage.get_project_path(name)
        if os.path.exists(project_path):
            for root, dirs, files in os.walk(project_path):
                for f in files:
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, project_path)
                    asset_fingerprints[rel_path] = int(os.path.getmtime(full_path))

        return {
            "project": project,
            "scripts": scripts,
            "asset_fingerprints": asset_fingerprints,
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.patch("/projects/{name}")
async def update_project(name: str, req: UpdateProjectRequest):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        if not storage.project_exists(name):
            raise HTTPException(status_code=404, detail=f"project_not_found: {name}")

        if req.content_mode is not None:
            raise HTTPException(status_code=400, detail="project_id_not_editable")

        project = storage.load_project(name)
        is_ad = project.get("content_mode") == "ad"

        if req.title is not None:
            project["title"] = req.title
        if req.style is not None:
            project["style"] = req.style

        for field in (
            "video_backend",
            "image_provider_t2i",
            "image_provider_i2i",
            "audio_backend",
            "text_backend_script",
            "text_backend_overview",
            "text_backend_style",
        ):
            if getattr(req, field) is not None:
                value = getattr(req, field)
                if value:
                    project[field] = value
                else:
                    project.pop(field, None)

        if req.video_generate_audio is not None:
            project["video_generate_audio"] = req.video_generate_audio

        if req.narration_voice is not None:
            voice = (req.narration_voice or "").strip()
            if voice:
                project["narration_voice"] = voice
            else:
                project.pop("narration_voice", None)

        if req.narration_speed is not None:
            speed = float(req.narration_speed)
            if not math.isfinite(speed) or speed <= 0:
                raise HTTPException(status_code=422, detail="narration_speed_must_be_positive")
            project["narration_speed"] = speed

        if req.aspect_ratio is not None:
            project["aspect_ratio"] = req.aspect_ratio

        if req.generation_mode is not None:
            if is_ad and req.generation_mode == "grid":
                raise HTTPException(status_code=400, detail="ad_grid_not_supported")
            project["generation_mode"] = req.generation_mode

        if req.default_duration is not None:
            if is_ad:
                raise HTTPException(status_code=400, detail="ad_no_default_duration")
            project["default_duration"] = req.default_duration

        if req.target_duration is not None:
            if not is_ad:
                raise HTTPException(status_code=400, detail="ad_only_field: target_duration")
            project["target_duration"] = req.target_duration

        if req.brief is not None:
            if not is_ad:
                raise HTTPException(status_code=400, detail="ad_only_field: brief")
            project["brief"] = req.brief if req.brief is not None else ""

        if req.style_template_id is not None:
            project["style_template_id"] = req.style_template_id

        if req.clear_style_image:
            project.pop("style_image", None)
            project.pop("style_description", None)

        if req.model_settings is not None:
            project["model_settings"] = req.model_settings

        if req.episodes is not None:
            existing_list = project.get("episodes", [])
            patch_map: dict[int, EpisodePatch] = {}
            for ep in req.episodes:
                patch_map[ep.episode] = ep

            new_episodes: list[dict] = []
            for existing_ep in existing_list:
                ep_num = existing_ep.get("episode")
                patch = patch_map.pop(ep_num, None)
                if patch is None:
                    new_episodes.append(existing_ep)
                    continue
                updated = dict(existing_ep)
                for field_name in EPISODE_PERSIST_FIELDS:
                    if getattr(patch, field_name) is not None:
                        value = getattr(patch, field_name)
                        if value is None:
                            updated.pop(field_name, None)
                        else:
                            updated[field_name] = value
                new_episodes.append(updated)
            project["episodes"] = new_episodes

        storage.save_project(name, project)

        return {"success": True, "project": project}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.delete("/projects/{name}")
async def delete_project(name: str):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        project_dir = storage.get_project_path(name)
        shutil.rmtree(project_dir)
        return {"success": True, "message": f"project_deleted: {name}"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{name}/scripts/{script_file}")
async def get_script(name: str, script_file: str):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        script = await asyncio.to_thread(storage.load_script, name, script_file)
        return {"script": script}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"script_not_found: {script_file}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


class UpdateSceneRequest(BaseModel):
    script_file: str
    updates: dict


@router.patch("/projects/{name}/script-scenes/{scene_id}")
async def update_scene(name: str, scene_id: str, req: UpdateSceneRequest):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()

        matched_scene: dict[str, Any] | None = None
        project = storage.load_project(name)
        scripts_dir = storage.get_project_path(name, "scripts")
        script_path = os.path.join(scripts_dir, req.script_file)

        with open(script_path, "r", encoding="utf-8") as f:
            script = json.load(f)

        for scene in script.get("scenes", []):
            if scene.get("scene_id") == scene_id:
                matched_scene = scene
                for key, value in req.updates.items():
                    if key in [
                        "duration_seconds",
                        "image_prompt",
                        "video_prompt",
                        "characters_in_scene",
                        "scenes",
                        "props",
                        "segment_break",
                        "note",
                    ]:
                        if value is None and key != "note":
                            continue
                        scene[key] = value
                break

        if matched_scene is None:
            raise HTTPException(status_code=404, detail=f"scene_not_found: {scene_id}")

        with open(script_path, "w", encoding="utf-8") as f:
            json.dump(script, f, indent=2, ensure_ascii=False)

        return {"success": True, "scene": matched_scene}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"script_not_found: {req.script_file}")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")





@router.post("/projects/{name}/source")
async def set_project_source(
    name: Annotated[str, FastAPIPath(pattern=r"^[a-zA-Z0-9_-]+$")],
    generate_overview: Annotated[bool, Form()] = True,
    content: Annotated[str | None, Form()] = None,
    file: Annotated[UploadFile | None, File()] = None,
):
    current_user = await require_current_user()
    MAX_CHARS = 200_000
    ALLOWED_SUFFIXES = {".txt", ".md"}

    if not content and not file:
        raise HTTPException(status_code=400, detail="content_or_file_required")
    if content and file:
        raise HTTPException(status_code=400, detail="one_of_content_or_file")

    try:
        storage = get_project_storage()

        raw: bytes | None = None
        original_name: str = "novel.txt"
        if file:
            original_name = file.filename or "novel.txt"
            suffix = Path(original_name).suffix.lower()
            if suffix not in ALLOWED_SUFFIXES:
                raise HTTPException(status_code=400, detail=f"unsupported_file_type: {suffix}")
            if file.size is not None and file.size > MAX_CHARS * 4:
                raise HTTPException(status_code=400, detail=f"file_too_large: {MAX_CHARS}")
            raw = await file.read()
        text_content: str = content or ""

        def _sync_write():
            if not storage.project_exists(name):
                raise HTTPException(status_code=404, detail=f"project_not_found: {name}")
            project_dir = storage.get_project_path(name)
            source_dir = project_dir / "source"
            source_dir.mkdir(parents=True, exist_ok=True)

            if raw is not None:
                safe_filename = Path(original_name).name
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    raise HTTPException(status_code=400, detail="invalid_encoding")
                if len(text) > MAX_CHARS:
                    raise HTTPException(status_code=400, detail=f"file_too_large: {MAX_CHARS}")
                (source_dir / safe_filename).write_text(text, encoding="utf-8")
                return safe_filename, len(text)
            else:
                if len(text_content) > MAX_CHARS:
                    raise HTTPException(status_code=400, detail=f"file_too_large: {MAX_CHARS}")
                safe_filename = "novel.txt"
                (source_dir / safe_filename).write_text(text_content, encoding="utf-8")
                return safe_filename, len(text_content)

        safe_filename, chars = await asyncio.to_thread(_sync_write)

        result: dict = {"success": True, "filename": safe_filename, "chars": chars}

        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")
    finally:
        if file:
            await file.close()


@router.post("/projects/{name}/generate-overview")
async def generate_overview(name: str):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        if not storage.project_exists(name):
            raise HTTPException(status_code=404, detail=f"project_not_found: {name}")

        raise HTTPException(status_code=500, detail="generate_overview_not_implemented")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {name}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


class UpdateOverviewRequest(BaseModel):
    synopsis: str | None = None
    genre: str | None = None
    theme: str | None = None
    world_setting: str | None = None


@router.patch("/projects/{name}/overview")
async def update_overview(name: str, req: UpdateOverviewRequest):
    current_user = await require_current_user()
    try:
        storage = get_project_storage()
        project = storage.load_project(name)

        if "overview" not in project:
            project["overview"] = {}
        if req.synopsis is not None:
            project["overview"]["synopsis"] = req.synopsis
        if req.genre is not None:
            project["overview"]["genre"] = req.genre
        if req.theme is not None:
            project["overview"]["theme"] = req.theme
        if req.world_setting is not None:
            project["overview"]["world_setting"] = req.world_setting

        storage.save_project(name, project)

        return {"success": True, "overview": project["overview"]}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/style-templates")
async def get_style_templates():
    _STYLE_TEMPLATES = {
        "live_premium_drama": {"category": "live", "name": "精品短剧", "prompt": "真人电视剧风格，精品短剧画风，大师级构图"},
        "live_cinematic_ancient": {"category": "live", "name": "精品古装", "prompt": "精品古装真人短剧风格，专业打光，高质量电视剧质感"},
        "live_ancient_xianxia": {"category": "live", "name": "古装仙侠", "prompt": "精品古装仙侠真人电视剧临江仙风格，美白滤镜，细腻真实的皮肤质感，精致打光，极致高清画质"},
        "live_urban_romance": {"category": "live", "name": "都市言情", "prompt": "都市言情风格，现代都市背景，浪漫爱情故事，时尚精致的影像质感"},
        "live_hollywood_sci-fi": {"category": "live", "name": "好莱坞科幻", "prompt": "好莱坞科幻大片风格，宏大的视觉特效，未来感场景设计，IMAX级画质"},
        "live_zhang_yimou": {"category": "live", "name": "张艺谋风格", "prompt": "参考张艺谋电影风格，极致用色，强烈构图，仪式感叙事"},
        "live_wong": {"category": "live", "name": "王家卫", "prompt": "王家卫风格，慵懒暧昧的氛围，颗粒感胶片，东方都市孤独美学"},
        "live_shaw": {"category": "live", "name": "邵氏武侠", "prompt": "参考港式武侠电视剧风格，邵氏电影风格，电影感"},
        "live_cinema": {"category": "live", "name": "院线电影", "prompt": "参考院线电影，真人电影风格，达芬奇专业调色，大师级构图，电影色调"},
        "live_kdrama": {"category": "live", "name": "韩剧偶像", "prompt": "韩剧偶像剧风格，干净高级的商业影像，柔光美颜，偶像剧式浪漫氛围"},
        "live_hk_crime": {"category": "live", "name": "香港警匪", "prompt": "香港警匪片风格，紧张刺激的节奏，都市夜景，黑帮题材美学"},
        "live_cyberpunk": {"category": "live", "name": "真人赛博朋克", "prompt": "参考真人赛博朋克电影，电影质感，极致高清画质"},
        "anim_cn_3d": {"category": "anim", "name": "国风3D", "prompt": "国风3D、影视级、虚幻引擎渲染"},
        "anim_ink_2d": {"category": "anim", "name": "传统水墨", "prompt": "传统水墨2D动画风格，淡雅色调，写意笔触，诗意氛围"},
        "anim_us_3d": {"category": "anim", "name": "美式3D", "prompt": "美式3D动画电影风格、影视级、虚幻引擎渲染"},
        "anim_kyoto": {"category": "anim", "name": "京都动画", "prompt": "商业动画画风，柔和光影效果，轻柔的赛璐珞上色，柔和的漫射光线，清晰干净的细轮廓线条，参考京都动画作品，参考石立太一动画作品，2d动画"},
        "anim_cyberpunk": {"category": "anim", "name": "动画赛博朋克", "prompt": "参考动画赛博朋克电影，电影质感，极致高清画质"},
        "anim_ink_wushan": {"category": "anim", "name": "雾山五行", "prompt": "硬核传统2D水墨，视觉特点：保留生猛的毛笔枯笔笔触，张力拉满。参考《雾山五行》风格"},
        "anim_ink_papercut": {"category": "anim", "name": "水墨剪纸", "prompt": "硬核传统2D水墨/剪纸，视觉特点：保留生猛的毛笔枯笔笔触，色彩借鉴中国传统重彩，战斗动作如中国武术般行云流水，张力拉满。参考《雾山五行》风格"},
        "anim_90s_retro": {"category": "anim", "name": "90年代复古", "prompt": "参考渡边信一郎作品风格，参考神山健治作品，90年代日本复古动漫风格，上世纪九十年代日漫风格的动漫，层次感，线条清晰，迷人氛围"},
    }
    grouped: dict = {"live": [], "anim": []}
    for tpl_id, data in _STYLE_TEMPLATES.items():
        grouped[data["category"]].append({
            "id": tpl_id,
            "name": data.get("name", tpl_id),
            "prompt": data["prompt"],
        })
    return grouped