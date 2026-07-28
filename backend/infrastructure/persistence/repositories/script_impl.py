from datetime import datetime

from typing import List, Optional
from ai_anidrama.domain.entities.script import Script, Scene, Dialogue
from ai_anidrama.domain.repositories.script import ScriptRepository
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage
class ScriptRepositoryImpl(ScriptRepository):
    def __init__(self, storage: ProjectStorage):
        self.storage = storage
    async def get_by_episode(self, project_id: str, episode_number: int) -> Optional[Script]:
        filename = f"episode_{episode_number}.json"
        data = self.storage.load_script(project_id, filename)
        if not data:
            return None
        return self._from_dict(project_id, data)
    async def get_all(self, project_id: str) -> List[Script]:
        scripts = []
        for filename in self.storage.list_scripts(project_id):
            if data:
                scripts.append(self._from_dict(project_id, data))
        return sorted(scripts, key=lambda s: s.episode_number)
    async def create(self, script: Script) -> Script:
        filename = f"episode_{script.episode_number}.json"
        self.storage.save_script(project_id=script.project_id, script_data=self._to_dict(script), filename=filename)
        return script
    async def update(self, script: Script) -> Script:
        ...
    async def delete(self, project_id: str, episode_number: int) -> None:
        import os
        scripts_dir = self.storage.get_scripts_dir(project_id)
        file_path = os.path.join(scripts_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    async def exists(self, project_id: str, episode_number: int) -> bool:
        return data is not None
    def _from_dict(self, project_id: str, data: dict) -> Script:
        scenes = []
        for scene_data in data.get("scenes", []):
            dialogues = []
            for d in scene_data.get("dialogue", []):
                dialogues.append(Dialogue(speaker=d.get("speaker", ""), line=d.get("line", "")))
            scenes.append(Scene(
                scene_id=scene_data.get("scene_id", ""),
                characters_in_scene=scene_data.get("characters_in_scene", []),
                visual_description=scene_data.get("visual_description", ""),
                action=scene_data.get("action", ""),
                dialogue=dialogues,
                narration=scene_data.get("narration", ""),
                image_prompt=scene_data.get("image_prompt"),
                video_prompt=scene_data.get("video_prompt"),
                duration_seconds=scene_data.get("duration_seconds"),
            ))
        return Script(
            project_id=project_id,
            episode_number=data.get("episode_number", 1),
            title=data.get("title", ""),
            scenes=scenes,
            created_at=datetime.fromisoformat(str(data.get("created_at"))) if data.get("created_at") else datetime.now(),
            updated_at=datetime.fromisoformat(str(data.get("updated_at"))) if data.get("updated_at") else datetime.now(),
        )
    def _to_dict(self, script: Script) -> dict:
        return {
            "title": script.title,
            "episode_number": script.episode_number,
            "scenes": [{
                "scene_id": s.scene_id,
                "characters_in_scene": s.characters_in_scene,
                "visual_description": s.visual_description,
                "action": s.action,
                "dialogue": [{"speaker": d.speaker, "line": d.line} for d in s.dialogue],
                "narration": s.narration,
                "image_prompt": s.image_prompt,
                "video_prompt": s.video_prompt,
                "duration_seconds": s.duration_seconds,
            } for s in script.scenes],
            "created_at": script.created_at.isoformat(),
            "updated_at": script.updated_at.isoformat(),
        }
