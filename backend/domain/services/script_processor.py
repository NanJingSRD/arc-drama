import json
import re
from datetime import datetime
from typing import Dict, List, Any

from ai_anidrama.domain.entities.script import Script, Scene, Dialogue


class ScriptProcessor:
    @staticmethod
    def extract_source_text(project_id: str, source_files: List[str]) -> str:
        combined_text = ""
        for filepath in source_files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    combined_text += f.read() + "\n\n"
            except Exception:
                pass
        return combined_text.strip()

    @staticmethod
    def parse_script_output(raw_text: str) -> Dict[str, Any]:
        cleaned_text = raw_text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()

        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError:
            json_match = re.search(r"\{[\s\S]*\}", cleaned_text)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            return {"title": "剧本", "episodes": [], "raw_text": raw_text}

    @staticmethod
    def normalize_dialogue(dialogue: Any) -> List[Dialogue]:
        if not dialogue:
            return []
        normalized = []
        for item in dialogue:
            if isinstance(item, dict):
                speaker = item.get("speaker") or item.get("角色") or item.get("人物") or ""
                line = item.get("line") or item.get("台词") or item.get("内容") or ""
                if speaker or line:
                    normalized.append(Dialogue(speaker=speaker, line=line))
            elif isinstance(item, str):
                normalized.append(Dialogue(speaker="", line=item))
        return normalized

    @staticmethod
    def normalize_scene(scene: Any, scene_index: int) -> Scene:
        if not isinstance(scene, dict):
            return Scene(scene_id=f"S{str(scene_index + 1).zfill(2)}")

        for key, value in list(scene.items()):
            if key.startswith("scene_") or key.startswith("Scene_"):
                if isinstance(value, dict):
                    return ScriptProcessor.normalize_scene(value, scene_index)

        return Scene(
            scene_id=scene.get("scene_id") or scene.get("id") or f"S{str(scene_index + 1).zfill(2)}",
            characters_in_scene=scene.get("characters_in_scene") or scene.get("characters") or scene.get("角色") or scene.get("人物") or [],
            visual_description=scene.get("visual_description") or scene.get("视觉描述") or "",
            action=scene.get("action") or scene.get("动作") or "",
            dialogue=ScriptProcessor.normalize_dialogue(scene.get("dialogue") or scene.get("对话") or []),
            narration=scene.get("narration") or scene.get("旁白") or "",
        )

    @staticmethod
    def create_scripts(project_id: str, script_data: Dict[str, Any]) -> List[Script]:
        scripts = []
        now = datetime.now()

        for episode_data in script_data.get("episodes", []):
            scenes = []
            for i, scene_data in enumerate(episode_data.get("scenes", [])):
                scenes.append(ScriptProcessor.normalize_scene(scene_data, i))

            script = Script(
                project_id=project_id,
                episode_number=episode_data.get("episode_number", 1),
                title=episode_data.get("title", f"第{episode_data.get('episode_number', 1)}集"),
                scenes=scenes,
                created_at=now,
                updated_at=now,
            )
            scripts.append(script)

        return scripts