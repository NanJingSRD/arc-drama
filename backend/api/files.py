"""文件管理路由"""

import asyncio
import logging
import os
import shutil
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Body, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse

from ai_anidrama.api.auth import CurrentUser
from core.project_change_hints import emit_project_change_batch
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

router = APIRouter()

_ = lambda x, **kwargs: x


ALLOWED_EXTENSIONS = {
    "source": [".txt", ".md", ".docx", ".epub", ".pdf"],
    "character": [".png", ".jpg", ".jpeg", ".webp"],
    "character_ref": [".png", ".jpg", ".jpeg", ".webp"],
    "scene": [".png", ".jpg", ".jpeg", ".webp"],
    "prop": [".png", ".jpg", ".jpeg", ".webp"],
    "product": [".png", ".jpg", ".jpeg", ".webp"],
    "product_ref": [".png", ".jpg", ".jpeg", ".webp"],
}


def get_project_storage() -> ProjectStorage:
    return ProjectStorage()


def _require_filename(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="missing_filename")
    return file.filename


@router.get("/files/{project_name}/{path:path}")
async def serve_project_file(project_name: str, path: str, request: Request):
    storage = get_project_storage()
    if not storage.project_exists(project_name):
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")

    project_dir = storage.get_project_path(project_name)
    file_path = project_dir / path

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"file_not_found: {path}")

    try:
        file_path.resolve().relative_to(project_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="forbidden_access")

    headers = {}
    if request.query_params.get("v") or path.startswith("versions/"):
        headers["Cache-Control"] = "public, max-age=31536000, immutable"

    return FileResponse(file_path, headers=headers)


@router.get("/global-assets/{asset_type}/{filename}")
async def serve_global_asset(asset_type: str, filename: str):
    if asset_type not in ("characters", "scenes", "props"):
        raise HTTPException(status_code=400, detail="invalid_asset_type")
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="invalid_asset_filename")

    storage = get_project_storage()
    root = storage.get_global_assets_root()
    path = root / asset_type / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail=f"file_not_found: {filename}")

    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="forbidden_access")

    return FileResponse(str(path))


@router.post("/projects/{project_name}/upload/{upload_type}")
async def upload_file(
    project_name: str,
    upload_type: str,
    _user: CurrentUser,
    file: UploadFile = File(...),
    name: str | None = None,
    on_conflict: str = "fail",
):
    if upload_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"invalid_upload_type: {upload_type}")

    original_filename = _require_filename(file)
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS[upload_type]:
        raise HTTPException(
            status_code=400,
            detail=f"unsupported_image_type: {ext}, allowed: {', '.join(ALLOWED_EXTENSIONS[upload_type])}",
        )

    try:
        content = await file.read()

        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)

            if upload_type == "source":
                target_dir = project_dir / "source"
                filename = original_filename
            elif upload_type == "character":
                target_dir = project_dir / "characters"
                filename = f"{name}.png" if name else f"{Path(original_filename).stem}.png"
            elif upload_type == "character_ref":
                target_dir = project_dir / "characters" / "refs"
                filename = f"{name}.png" if name else f"{Path(original_filename).stem}.png"
            elif upload_type == "scene":
                target_dir = project_dir / "scenes"
                filename = f"{name}.png" if name else f"{Path(original_filename).stem}.png"
            elif upload_type == "prop":
                target_dir = project_dir / "props"
                filename = f"{name}.png" if name else f"{Path(original_filename).stem}.png"
            elif upload_type == "product":
                target_dir = project_dir / "products"
                filename = f"{name}.png" if name else f"{Path(original_filename).stem}.png"
            elif upload_type == "product_ref":
                target_dir = project_dir / "products" / "refs"
                filename = ""
            else:
                target_dir = project_dir / upload_type
                filename = original_filename

            target_dir.mkdir(parents=True, exist_ok=True)

            if upload_type == "product_ref":
                ref_ext = Path(original_filename).suffix.lower() or ".png"
                seq = 1
                while True:
                    candidate = target_dir / f"{name}_{seq}{ref_ext}"
                    try:
                        candidate.touch(exist_ok=False)
                        break
                    except FileExistsError:
                        seq += 1
                filename = candidate.name

            target_path = target_dir / filename
            with open(target_path, "wb") as f:
                f.write(content)

            if upload_type == "source":
                relative_path = f"source/{filename}"
            elif upload_type == "character":
                relative_path = f"characters/{filename}"
            elif upload_type == "character_ref":
                relative_path = f"characters/refs/{filename}"
            elif upload_type == "scene":
                relative_path = f"scenes/{filename}"
            elif upload_type == "prop":
                relative_path = f"props/{filename}"
            elif upload_type == "product":
                relative_path = f"products/{filename}"
            elif upload_type == "product_ref":
                relative_path = f"products/refs/{filename}"
            else:
                relative_path = f"{upload_type}/{filename}"

            return {
                "success": True,
                "filename": filename,
                "path": relative_path,
                "url": f"/api/v1/files/{project_name}/{relative_path}",
            }

        return await asyncio.to_thread(_sync)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{project_name}/files")
async def list_project_files(project_name: str, _user: CurrentUser):
    try:
        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)

            files = {
                "source": [],
                "characters": [],
                "scenes": [],
                "props": [],
                "products": [],
                "storyboards": [],
                "videos": [],
                "output": [],
            }

            for subdir, file_list in files.items():
                subdir_path = project_dir / subdir
                if not subdir_path.exists():
                    continue
                for f in subdir_path.iterdir():
                    if f.is_file() and not f.name.startswith("."):
                        file_list.append({
                            "name": f.name,
                            "size": f.stat().st_size,
                            "url": f"/api/v1/files/{project_name}/{subdir}/{f.name}",
                        })

            return {"files": files}

        return await asyncio.to_thread(_sync)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{project_name}/source/{filename}")
async def get_source_file(project_name: str, filename: str, _user: CurrentUser):
    try:
        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)
            source_path = project_dir / "source" / filename

            if not source_path.exists():
                raise HTTPException(status_code=404, detail=f"file_not_found: {filename}")

            try:
                source_path.resolve().relative_to(project_dir.resolve())
            except ValueError:
                raise HTTPException(status_code=403, detail="forbidden_access")

            return source_path.read_text(encoding="utf-8")

        content = await asyncio.to_thread(_sync)
        return PlainTextResponse(content)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="invalid_encoding")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.put("/projects/{project_name}/source/{filename}")
async def update_source_file(
    project_name: str,
    filename: str,
    _user: CurrentUser,
    content: str = Body(..., media_type="text/plain"),
):
    try:
        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)
            source_dir = project_dir / "source"
            source_dir.mkdir(parents=True, exist_ok=True)
            source_path = source_dir / filename

            try:
                source_path.resolve().relative_to(project_dir.resolve())
            except ValueError:
                raise HTTPException(status_code=403, detail="forbidden_access")

            source_path.write_text(content, encoding="utf-8")
            return {"success": True, "path": f"source/{filename}"}

        return await asyncio.to_thread(_sync)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.delete("/projects/{project_name}/source/{filename}")
async def delete_source_file(project_name: str, filename: str, _user: CurrentUser):
    try:
        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)
            source_path = project_dir / "source" / filename

            try:
                source_path.resolve().relative_to(project_dir.resolve())
            except ValueError:
                raise HTTPException(status_code=403, detail="forbidden_access")

            if source_path.exists():
                source_path.unlink()
                raw_dir = project_dir / "source" / "raw"
                if raw_dir.exists():
                    stem = source_path.stem
                    for raw_file in raw_dir.iterdir():
                        if raw_file.is_file() and raw_file.stem == stem:
                            raw_file.unlink()
                return {"success": True}
            else:
                raise HTTPException(status_code=404, detail=f"file_not_found: {filename}")

        return await asyncio.to_thread(_sync)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")


@router.get("/projects/{project_name}/drafts")
async def list_drafts(project_name: str, _user: CurrentUser, _t=_):
    try:
        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)
            drafts_dir = project_dir / "drafts"

            result = {}
            if drafts_dir.exists():
                for episode_dir in sorted(drafts_dir.iterdir()):
                    if episode_dir.is_dir() and episode_dir.name.startswith("episode_"):
                        episode_num = episode_dir.name.replace("episode_", "")
                        files = []
                        for f in sorted(episode_dir.glob("*.md")):
                            files.append({
                                "name": f.name,
                                "step": _extract_step_number(f.name),
                                "title": _get_step_title(f.name, _t),
                                "size": f.stat().st_size,
                                "modified": f.stat().st_mtime,
                            })
                        result[episode_num] = files

            return {"drafts": result}

        return await asyncio.to_thread(_sync)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")


def _extract_step_number(filename: str) -> int:
    import re
    match = re.search(r"step(\d+)", filename)
    return int(match.group(1)) if match else 0


def _get_step_files(content_mode: str, generation_mode: str | None = None) -> dict:
    if generation_mode == "reference_video":
        return {1: "step1_reference_units.md"}
    if content_mode == "narration":
        return {1: "step1_segments.md"}
    return {1: "step1_normalized_script.md"}


def _get_step_title(filename: str, _t) -> str:
    titles = {
        "step1_normalized_script.md": _t("normalized_script"),
        "step1_segments.md": _t("segment_splitting"),
        "step1_reference_units.md": _t("segment_splitting"),
    }
    return titles.get(filename, filename)


def _load_project_modes(project_id: str, episode: int) -> tuple[str, str | None]:
    storage = get_project_storage()
    try:
        data = storage.load_project(project_id)
    except FileNotFoundError:
        return "drama", None
    content_mode = data.get("content_mode", "drama")
    episodes = data.get("episodes") or []
    ep_dict = next((ep for ep in episodes if ep.get("episode") == episode), {})
    generation_mode = ep_dict.get("generation_mode") or data.get("generation_mode")
    return content_mode, generation_mode


_STEP1_CANDIDATES = [
    "step1_reference_units.md",
    "step1_segments.md",
    "step1_normalized_script.md",
]


def _resolve_step1_path(drafts_dir: Path, step_num: int, primary: Path) -> Path:
    if step_num != 1 or primary.exists():
        return primary
    for candidate in _STEP1_CANDIDATES:
        alt = drafts_dir / candidate
        if alt.exists():
            return alt
    return primary


@router.get("/projects/{project_name}/drafts/{episode}/step{step_num}")
async def get_draft_content(project_name: str, episode: int, step_num: int, _user: CurrentUser):
    try:
        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)
            data = storage.load_project(project_name)
            content_mode = data.get("content_mode", "drama")
            episodes = data.get("episodes", [])
            ep_dict = next((ep for ep in episodes if ep.get("episode") == episode), {})
            generation_mode = ep_dict.get("generation_mode") or data.get("generation_mode")

            step_files = _get_step_files(content_mode, generation_mode)

            if step_num not in step_files:
                raise HTTPException(status_code=400, detail=f"invalid_step_num: {step_num}")

            drafts_dir = project_dir / "drafts" / f"episode_{episode}"
            draft_path = _resolve_step1_path(drafts_dir, step_num, drafts_dir / step_files[step_num])

            if not draft_path.exists():
                raise HTTPException(status_code=404, detail="draft_file_not_found")

            return draft_path.read_text(encoding="utf-8")

        content = await asyncio.to_thread(_sync)
        return PlainTextResponse(content)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")


@router.put("/projects/{project_name}/drafts/{episode}/step{step_num}")
async def update_draft_content(
    project_name: str,
    episode: int,
    step_num: int,
    _user: CurrentUser,
    _t=_,
    content: str = Body(..., media_type="text/plain"),
):
    try:
        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)
            data = storage.load_project(project_name)
            content_mode = data.get("content_mode", "drama")
            episodes = data.get("episodes", [])
            ep_dict = next((ep for ep in episodes if ep.get("episode") == episode), {})
            generation_mode = ep_dict.get("generation_mode") or data.get("generation_mode")

            step_files = _get_step_files(content_mode, generation_mode)

            if step_num not in step_files:
                raise HTTPException(status_code=400, detail=f"invalid_step_num: {step_num}")

            drafts_dir = project_dir / "drafts" / f"episode_{episode}"
            drafts_dir.mkdir(parents=True, exist_ok=True)

            draft_path = drafts_dir / step_files[step_num]
            is_new = not draft_path.exists()
            draft_path.write_text(content, encoding="utf-8")

            action = "created" if is_new else "updated"
            label_prefix = _t("segment_splitting") if content_mode == "narration" else _t("normalized_script")
            change = {
                "entity_type": "draft",
                "action": action,
                "entity_id": f"episode_{episode}_step{step_num}",
                "label": _t("draft_event_label", episode=episode, label_prefix=label_prefix),
                "episode": episode,
                "focus": {
                    "pane": "episode",
                    "episode": episode,
                },
                "important": is_new,
            }
            try:
                emit_project_change_batch(project_name, [change], source="worker")
            except Exception:
                logger.warning("发送 draft 事件失败 project=%s episode=%s", project_name, episode, exc_info=True)

            return {"success": True, "path": draft_path.relative_to(project_dir).as_posix()}

        return await asyncio.to_thread(_sync)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")


@router.delete("/projects/{project_name}/drafts/{episode}/step{step_num}")
async def delete_draft(project_name: str, episode: int, step_num: int, _user: CurrentUser):
    try:
        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)
            data = storage.load_project(project_name)
            content_mode = data.get("content_mode", "drama")
            episodes = data.get("episodes", [])
            ep_dict = next((ep for ep in episodes if ep.get("episode") == episode), {})
            generation_mode = ep_dict.get("generation_mode") or data.get("generation_mode")

            step_files = _get_step_files(content_mode, generation_mode)

            if step_num not in step_files:
                raise HTTPException(status_code=400, detail=f"invalid_step_num: {step_num}")

            drafts_dir = project_dir / "drafts" / f"episode_{episode}"
            draft_path = _resolve_step1_path(drafts_dir, step_num, drafts_dir / step_files[step_num])

            if draft_path.exists():
                draft_path.unlink()
                return {"success": True}
            else:
                raise HTTPException(status_code=404, detail="draft_file_not_found")

        return await asyncio.to_thread(_sync)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")


@router.post("/projects/{project_name}/style-image")
async def upload_style_image(project_name: str, _user: CurrentUser, file: UploadFile = File(...)):
    original_filename = _require_filename(file)

    ext = Path(original_filename).suffix.lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail=f"unsupported_image_type: {ext}, allowed: .png, .jpg, .jpeg, .webp",
        )

    try:
        content = await file.read()

        def _sync():
            storage = get_project_storage()
            project_dir = storage.get_project_path(project_name)
            style_filename = f"style_reference{ext}"
            output_path = project_dir / style_filename

            with open(output_path, "wb") as f:
                f.write(content)

            project = storage.load_project(project_name)
            project["style_image"] = style_filename
            project["style_description"] = ""
            project.pop("style_template_id", None)
            project["style"] = ""
            storage.save_project(project_name, project)

            return {
                "success": True,
                "style_image": style_filename,
                "style_description": "",
                "url": f"/api/v1/files/{project_name}/{style_filename}",
            }

        return await asyncio.to_thread(_sync)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"project_not_found: {project_name}")
    except HTTPException:
        raise
    except Exception:
        logger.exception("请求处理失败")
        raise HTTPException(status_code=500, detail="internal_server_error")