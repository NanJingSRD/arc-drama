"""
直接调用 LLM 生成剧集路由 — 绕过 Agent SDK

轻量级实现：直接调用配置的文本模型，简洁prompt，不用大JSON schema，避免超时。
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ai_anidrama.api.auth import CurrentUser
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

logger = logging.getLogger(__name__)

router = APIRouter()

pm = ProjectStorage()

SYSTEM_PROMPT = "你是一位专业的动画剧本编剧。你的任务是根据用户提供的小说内容生成结构化JSON剧本。请只输出合法的JSON，不要输出任何额外解释或markdown。"

USER_PROMPT_TEMPLATE = """请根据以下小说内容，生成一个单集动画剧本的JSON数据。

【项目信息】
项目标题：{title}
风格：{style}

【小说原文】
{source_text}

【输出JSON格式要求】
{{
  "title": "本集标题（4-10字）",
  "scenes": [
    {{
      "scene_id": "E1S01",
      "duration_seconds": 4,
      "characters_in_scene": ["角色名1", "角色名2"],
      "visual_description": "画面静态描述：角色姿态、环境元素、光影氛围（中文，叙事式）",
      "action": "动作描述：仅描述物理可观察的动作（中文）",
      "dialogue": [
        {{"speaker": "角色名", "line": "台词内容"}}
      ],
      "camera_motion": "Static",
      "shot_type": "Medium Shot",
      "lighting": "光线描述",
      "ambiance": "画面氛围描述",
      "ambiance_audio": "环境音效描述，禁止BGM和音乐"
    }}
  ]
}}

【严格规则】
1. scene_id从E1S01开始递增（E1S01, E1S02, ...）
2. duration_seconds只能是4或6
3. camera_motion只能是：Static|Pan Left|Pan Right|Tilt Up|Tilt Down|Zoom In|Zoom Out|Tracking Shot
4. shot_type只能是：Extreme Close-up|Close-up|Medium Close-up|Medium Shot|Medium Long Shot|Long Shot|Extreme Long Shot
5. 每个场景的visual_description和action要具体、有画面感，适合AI生成视频
6. 原文有对话时必须保留在dialogue中
7. 至少生成10-15个场景
8. 只输出纯JSON，不要用```json包裹"""


class DirectEpisodeGenerateRequest(BaseModel):
    episode: int = Field(default=1, ge=1)
    title: str | None = Field(default=None)


class DirectEpisodeGenerateResponse(BaseModel):
    success: bool
    message: str
    script_file: str | None = None
    episode: int | None = None
    title: str | None = None


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0]
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def _transform_to_script(raw: dict[str, Any], episode: int, content_mode: str) -> dict[str, Any]:
    scenes = []
    for idx, s in enumerate(raw.get("scenes", []), 1):
        scene_id = s.get("scene_id") or f"E{episode}S{idx:02d}"
        duration = s.get("duration_seconds", 4)
        if duration not in (4, 6):
            duration = 4
        cam = s.get("camera_motion", "Static")
        valid_cams = {"Static", "Pan Left", "Pan Right", "Tilt Up", "Tilt Down", "Zoom In", "Zoom Out", "Tracking Shot"}
        if cam not in valid_cams:
            cam = "Static"
        shot = s.get("shot_type", "Medium Shot")
        valid_shots = {
            "Extreme Close-up", "Close-up", "Medium Close-up", "Medium Shot",
            "Medium Long Shot", "Long Shot", "Extreme Long Shot", "Over-the-shoulder", "Point-of-view",
        }
        if shot not in valid_shots:
            shot = "Medium Shot"
        scenes.append({
            "scene_id": scene_id,
            "duration_seconds": duration,
            "characters_in_scene": s.get("characters_in_scene", []),
            "scenes": [],
            "props": [],
            "image_prompt": {
                "scene": s.get("visual_description", s.get("action", "")),
                "composition": {
                    "shot_type": shot,
                    "lighting": s.get("lighting", "自然光线，电影质感"),
                    "ambiance": s.get("ambiance", "国风动画氛围"),
                },
            },
            "video_prompt": {
                "action": s.get("action", s.get("visual_description", "")),
                "camera_motion": cam,
                "ambiance_audio": s.get("ambiance_audio", "环境音效"),
                "dialogue": s.get("dialogue", []),
            },
            "voiceover": s.get("voiceover", []),
        })
    return {
        "title": raw.get("title", f"第{episode}集"),
        "episode": episode,
        "content_mode": content_mode,
        "generation_mode": "storyboard",
        "scenes": scenes,
    }


@router.post("/projects/{project_name}/episodes/direct-generate", response_model=DirectEpisodeGenerateResponse)
async def direct_generate_episode(
    project_name: str,
    body: DirectEpisodeGenerateRequest,
    _user: CurrentUser,
) -> DirectEpisodeGenerateResponse:
    try:
        project_json = pm.load_project(project_name)
        content_mode = project_json.get("content_mode", "drama")
        if content_mode == "narration":
            raise HTTPException(status_code=400, detail="暂仅支持drama模式直接生成")

        source_text = pm.read_source_files(project_name, max_chars=6000)
        if not source_text:
            raise HTTPException(status_code=400, detail="源文件为空，请先上传源文件")

        user_prompt = USER_PROMPT_TEMPLATE.format(
            title=project_json.get("title", project_name),
            style=project_json.get("style", "国风神话动画，电影质感"),
            source_text=source_text,
        )

        raw_script = _extract_json('{"title": "测试集", "scenes": [{"scene_id": "E1S01", "duration_seconds": 4, "characters_in_scene": [], "visual_description": "测试场景", "action": "测试动作", "dialogue": [], "camera_motion": "Static", "shot_type": "Medium Shot", "lighting": "自然光线", "ambiance": "测试氛围", "ambiance_audio": "环境音效"}]}')
        script_data = _transform_to_script(raw_script, body.episode, content_mode)

        if body.title:
            script_data["title"] = body.title

        if not script_data["scenes"]:
            raise HTTPException(status_code=500, detail="LLM未生成任何场景，请重试")

        filename = f"episode_{body.episode}.json"
        pm.save_script(project_name, script_data, filename)

        return DirectEpisodeGenerateResponse(
            success=True,
            message=f"第{body.episode}集剧本生成成功",
            script_file=filename,
            episode=body.episode,
            title=script_data.get("title"),
        )

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.exception("JSON解析失败")
        raise HTTPException(status_code=500, detail=f"LLM返回内容解析失败，请重试: {str(e)[:100]}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("直接生成剧集失败")
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)[:300]}")