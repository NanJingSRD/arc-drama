from typing import Dict, Optional

from ai_anidrama.domain.entities.script import Scene


class StoryboardGenerator:
    @staticmethod
    def build_image_prompt(scene: Scene, character_descriptions: Dict[str, str] = {}) -> str:
        prompt_parts = []
        if scene.visual_description:
            prompt_parts.append(scene.visual_description)
        if scene.action:
            prompt_parts.append(f"动作：{scene.action}")
        if scene.characters_in_scene:
            char_parts = []
            for char_name in scene.characters_in_scene:
                if char_name in character_descriptions:
                    char_parts.append(f"{char_name}（{character_descriptions[char_name]}）")
                else:
                    char_parts.append(char_name)
            prompt_parts.append(f"角色：{', '.join(char_parts)}")
        if scene.narration:
            prompt_parts.append(f"旁白：{scene.narration}")
        return " ".join(prompt_parts)

    @staticmethod
    def build_video_prompt(scene: Scene, character_descriptions: Dict[str, str] = {}) -> str:
        prompt = StoryboardGenerator.build_image_prompt(scene, character_descriptions)
        if scene.duration_seconds:
            prompt += f"，时长：{scene.duration_seconds}秒"
        if scene.dialogue:
            dialogue_text = "，对话：".join([f"{d.speaker}：{d.line}" for d in scene.dialogue])
            prompt += f"，{dialogue_text}"
        return prompt

    @staticmethod
    def estimate_duration(scene: Scene) -> int:
        base_duration = 5
        if scene.narration:
            base_duration += len(scene.narration) // 15
        for d in scene.dialogue:
            base_duration += len(d.line) // 10
        if scene.action:
            base_duration += len(scene.action) // 20
        return min(max(base_duration, 3), 60)