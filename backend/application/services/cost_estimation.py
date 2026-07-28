"""费用估算服务 — 计算预估 + 汇总实际费用。"""

from __future__ import annotations

import logging
from typing import Any

from ai_anidrama.infrastructure.config.settings import settings
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage

logger = logging.getLogger(__name__)

CostBreakdown = dict[str, float]


def _add_cost(target: CostBreakdown, amount: float, currency: str) -> None:
    if amount <= 0:
        return
    target[currency] = round(target.get(currency, 0) + amount, 6)


def _merge_breakdowns(a: CostBreakdown, b: CostBreakdown) -> CostBreakdown:
    merged = dict(a)
    for cur, amt in b.items():
        merged[cur] = round(merged.get(cur, 0) + amt, 6)
    return merged


class CostEstimationService:
    """费用估算服务：计算项目预估费用和实际费用。"""

    def __init__(self):
        self._storage = ProjectStorage()

    async def compute(
        self,
        project_id: str,
    ) -> dict[str, Any]:
        """计算项目费用估算。

        返回结构：
        {
            "project_name": str,
            "models": {"image": {...}, "video": {...}, "audio": {...}},
            "episodes": [...],
            "project_totals": {"estimate": {...}, "actual": {...}},
        }
        """
        project_data = self._storage.load_project(project_id)

        # 解析模型配置
        image_provider = project_data.get("image_provider_t2i") or settings.default_provider
        image_model = settings.default_image_model
        if isinstance(image_provider, str) and "/" in image_provider:
            image_provider, image_model = image_provider.split("/", 1)

        video_provider = project_data.get("video_backend") or settings.default_provider
        video_model = settings.default_video_model
        if isinstance(video_provider, str) and "/" in video_provider:
            video_provider, video_model = video_provider.split("/", 1)

        audio_provider = settings.default_provider
        audio_model = settings.default_text_model

        # 加载所有剧本
        scripts: dict[str, dict] = {}
        for ep in project_data.get("episodes", []):
            script_file = ep.get("script_file", "")
            if script_file:
                script_data = self._storage.load_script(project_id, script_file)
                if script_data:
                    scripts[script_file] = script_data

        episodes_meta = project_data.get("episodes", [])

        # 获取实际费用（暂无追踪，返回空）
        actual_by_segment: dict[str, dict[str, CostBreakdown]] = {}

        episodes_result = []
        proj_est: dict[str, CostBreakdown] = {}
        proj_act: dict[str, CostBreakdown] = {}

        for ep_meta in episodes_meta:
            script_file = ep_meta.get("script_file", "")
            script = scripts.get(script_file)
            if not script:
                continue

            raw_segments = script.get("scenes", [])

            segments_result = []
            ep_est: dict[str, CostBreakdown] = {}
            ep_act: dict[str, CostBreakdown] = {}

            for seg in raw_segments:
                seg_id = seg.get("scene_id", "")
                duration = seg.get("duration_seconds", 8)

                est_image: CostBreakdown = {}
                est_video: CostBreakdown = {}
                est_audio: CostBreakdown = {}

                # 图片费用估算（简化：每张图固定费用）
                if image_provider and image_provider != "unknown":
                    _add_cost(est_image, 0.001, "USD")

                # 视频费用估算（简化：按秒计费）
                if video_provider and video_provider != "unknown":
                    _add_cost(est_video, round(duration * 0.0005, 6), "USD")

                # 旁白配音费用估算（按字符数）
                novel_text = seg.get("novel_text") or seg.get("narration", "")
                narration_chars = len(novel_text.strip()) if isinstance(novel_text, str) else 0
                if narration_chars:
                    _add_cost(est_audio, round(narration_chars * 0.00001, 6), "USD")

                seg_actual = actual_by_segment.get(seg_id, {})
                act_image: CostBreakdown = seg_actual.get("image", {})
                act_video: CostBreakdown = seg_actual.get("video", {})
                act_audio: CostBreakdown = seg_actual.get("audio", {})

                segments_result.append(
                    {
                        "segment_id": seg_id,
                        "duration_seconds": duration,
                        "estimate": {"image": est_image, "video": est_video, "audio": est_audio},
                        "actual": {"image": act_image, "video": act_video, "audio": act_audio},
                    }
                )

                seg_est_by_type = {"image": est_image, "video": est_video, "audio": est_audio}
                seg_act_by_type = {"image": act_image, "video": act_video, "audio": act_audio}
                for cost_type in ("image", "video", "audio"):
                    ep_est[cost_type] = _merge_breakdowns(
                        ep_est.get(cost_type, {}),
                        seg_est_by_type[cost_type],
                    )
                    ep_act[cost_type] = _merge_breakdowns(
                        ep_act.get(cost_type, {}),
                        seg_act_by_type[cost_type],
                    )

            episodes_result.append(
                {
                    "episode": ep_meta.get("episode"),
                    "title": ep_meta.get("title", ""),
                    "segments": segments_result,
                    "totals": {"estimate": ep_est, "actual": ep_act},
                }
            )

            for cost_type in ("image", "video", "audio"):
                proj_est[cost_type] = _merge_breakdowns(
                    proj_est.get(cost_type, {}),
                    ep_est.get(cost_type, {}),
                )
                proj_act[cost_type] = _merge_breakdowns(
                    proj_act.get(cost_type, {}),
                    ep_act.get(cost_type, {}),
                )

        return {
            "project_name": project_id,
            "models": {
                "image": {"provider": image_provider, "model": image_model},
                "video": {"provider": video_provider, "model": video_model},
                "audio": {"provider": audio_provider, "model": audio_model},
            },
            "episodes": episodes_result,
            "project_totals": {"estimate": proj_est, "actual": proj_act},
        }