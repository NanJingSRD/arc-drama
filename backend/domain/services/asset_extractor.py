import re
from datetime import datetime

from typing import Dict, List, Set, Any
from ai_anidrama.domain.entities.character import Character
from ai_anidrama.domain.entities.scene import SceneEntity
from ai_anidrama.domain.entities.prop import Prop


class AssetExtractor:
    CHARACTER_KEYWORDS = ["角色", "人物", "主角", "配角", "英雄", "反派", "勇士"]
    SCENE_KEYWORDS = ["场景", "地点", "环境", "背景", "地点", "宫殿", "森林", "城市"]
    PROP_KEYWORDS = ["道具", "物品", "武器", "装备", "宝物", "神器", "法器"]

    @staticmethod
    def extract_characters(project_id: str, scripts: List[Dict[str, Any]]) -> List[Character]:
        characters: Dict[str, Character] = {}
        now = datetime.now()
        for script in scripts:
            for episode in script.get("episodes", []):
                for scene in episode.get("scenes", []):
                    for char_name in scene.get("characters_in_scene", []):
                        if char_name and char_name not in characters:
                            description = AssetExtractor._build_description(scene)
                            characters[char_name] = Character(
                                project_id=project_id,
                                name=char_name,
                                description=description,
                                created_at=now,
                                updated_at=now,
                            )
        return list(characters.values())

    @staticmethod
    def extract_scenes(project_id: str, scripts: List[Dict[str, Any]]) -> List[SceneEntity]:
        scenes: Dict[str, SceneEntity] = {}
        now = datetime.now()
        for script in scripts:
            for episode in script.get("episodes", []):
                for scene in episode.get("scenes", []):
                    visual_desc = scene.get("visual_description", "")
                    scene_name = AssetExtractor._extract_scene_name(visual_desc, scene.get("scene_id", ""))
                    if scene_name and scene_name not in scenes:
                        scenes[scene_name] = SceneEntity(
                            project_id=project_id,
                            name=scene_name,
                            description=visual_desc,
                            created_at=now,
                            updated_at=now,
                        )
        return list(scenes.values())

    @staticmethod
    def extract_props(project_id: str, scripts: List[Dict[str, Any]]) -> List[Prop]:
        props: Dict[str, Prop] = {}
        now = datetime.now()
        for script in scripts:
            for episode in script.get("episodes", []):
                for scene in episode.get("scenes", []):
                    visual_desc = scene.get("visual_description", "")
                    action_desc = scene.get("action", "")
                    narration_desc = scene.get("narration", "")
                    extracted_props = AssetExtractor._extract_prop_names(
                        f"{visual_desc} {action_desc} {narration_desc}"
                    )
                    for prop_name in extracted_props:
                        if prop_name not in props:
                            props[prop_name] = Prop(
                                project_id=project_id,
                                name=prop_name,
                                description=f"出现在场景中",
                                created_at=now,
                                updated_at=now,
                            )
        return list(props.values())

    @staticmethod
    def _build_description(scene: Dict[str, Any]) -> str:
        parts = []
        if scene.get("visual_description"):
            parts.append(scene["visual_description"])
        if scene.get("action"):
            parts.append(scene["action"])
        if scene.get("narration"):
            parts.append(scene["narration"])
        return " ".join(parts)[:500]

    @staticmethod
    def _extract_scene_name(description: str, scene_id: str) -> str:
        patterns = [
            r"[在从于]([^\s，。！？；]+)[的中里]",
            r"([^\s，。！？；]{2,})[场景地点环境]",
            r"场景：([^\s，。！？；]+)",
            r"地点：([^\s，。！？；]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, description)
            if match:
                return match.group(1).strip()
        return scene_id.replace("S", "场景")

    @staticmethod
    def _extract_prop_names(text: str) -> Set[str]:
        props: Set[str] = set()
        patterns = [
            r"[使用拿着握着带着]([^\s，。！？；]{2,6})",
            r"([^\s，。！？；]{2,6})[武器刀剑枪杖法器]",
            r"([^\s，。！？；]{2,6})[宝物神器道具]",
            r"[有拿着]([^\s，。！？；]{2,6})",
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text)
            props.update(matches)
        return props