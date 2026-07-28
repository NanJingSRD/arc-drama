from datetime import datetime
from typing import List, Dict, Any, Optional

from ai_anidrama.application.dtos.script import (
    ScriptResponse,
    ScriptListResponse,
    ScriptProcessRequest,
    ScriptProcessResponse,
    SceneDTO,
    DialogueDTO,
)
from ai_anidrama.core.exceptions import ProjectNotFoundError, ScriptNotFoundError
from ai_anidrama.core.validators import validate_project_id
from ai_anidrama.domain.repositories.project import ProjectRepository
from ai_anidrama.domain.repositories.script import ScriptRepository
from ai_anidrama.infrastructure.external.queue.task_queue import TaskQueue
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage


class ScriptService:
    SYSTEM_PROMPT_SCRIPT = """你是一位专业的动画剧本编剧。你的任务是根据小说内容生成结构化JSON剧本。
【JSON格式要求】
1. 必须输出合法的JSON格式，不要输出任何额外解释或markdown
2. 所有字符串必须使用英文双引号包裹
3. 对象和数组元素之间必须有逗号分隔，最后一个元素后不要加逗号
4. 如果描述文本中包含对话内容需要引用，请使用中文引号「」而非英文双引号，例如："黛玉说道：「花落知多少」"
5. 如果必须使用英文双引号，请务必转义为 \\"
6. 确保JSON可以被标准JSON解析器正确解析
7. 直接输出纯JSON文本，不要添加 ```json 标记"""

    def __init__(
        self,
        project_repo: ProjectRepository,
        script_repo: ScriptRepository,
        project_storage: ProjectStorage,
        task_queue: TaskQueue,
    ):
        self.project_repo = project_repo
        self.script_repo = script_repo
        self.project_storage = project_storage
        self.task_queue = task_queue

    async def list_scripts(self, project_id: str) -> ScriptListResponse:
        validate_project_id(project_id)
        if not await self.project_repo.exists(project_id):
            raise ProjectNotFoundError(project_id)
        scripts = await self.script_repo.get_all(project_id)
        responses = [self._to_response(s) for s in scripts]
        return ScriptListResponse(scripts=responses, total=len(responses))

    async def get_script(self, project_id: str, episode_number: int) -> ScriptResponse:
        script = await self.script_repo.get_by_episode(project_id, episode_number)
        if not script:
            raise ScriptNotFoundError(project_id, episode_number)
        return self._to_response(script)

    async def process_script(self, project_id: str, req: ScriptProcessRequest) -> ScriptProcessResponse:
        source_text = self.project_storage.read_source_files(project_id)
        if not source_text:
            raise ValueError("No source files found in project")

        result = await self.task_queue.enqueue_task(
            project_id=project_id,
            task_type="script_process",
            media_type="text",
            resource_id="script_process",
            payload={"episodes_count": req.episodes_count},
        )

        return ScriptProcessResponse(
            success=True,
            message="任务已入队，正在生成剧本",
            task_id=result["task_id"],
        )

    async def save_script(self, project_id: str, script_data: Dict[str, Any]) -> ScriptResponse:
        from ai_anidrama.domain.entities.script import Script, Scene, Dialogue

        scenes = []
        for scene_data in script_data.get("scenes", []):
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

        script = Script(
            episode_number=script_data.get("episode_number", 1),
            title=script_data.get("title", f"第{script_data.get('episode_number', 1)}集"),
            scenes=scenes,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        await self.script_repo.create(project_id, script)

        project = await self.project_repo.get_by_id(project_id)
        if project:
            project.add_episode(script.episode_number, script.title, f"episode_{script.episode_number}.json")
            project.updated_at = datetime.now()
            await self.project_repo.update(project)

        return self._to_response(script)

    async def delete_script(self, project_id: str, episode_number: int) -> None:
        await self.script_repo.delete(project_id, episode_number)

    def _to_response(self, script) -> ScriptResponse:
        from ai_anidrama.domain.entities.script import Script

        if isinstance(script, Script):
            scenes_dto = []
            for s in script.scenes:
                dialogues = [DialogueDTO(speaker=d.speaker, line=d.line) for d in s.dialogue]
                scenes_dto.append(SceneDTO(
                    scene_id=s.scene_id,
                    characters_in_scene=s.characters_in_scene,
                    visual_description=s.visual_description,
                    action=s.action,
                    narration=s.narration,
                    image_prompt=s.image_prompt,
                    video_prompt=s.video_prompt,
                    duration_seconds=s.duration_seconds,
                    dialogue=dialogues,
                ))
            return ScriptResponse(
                project_id=script.project_id,
                episode=script.episode_number,
                title=script.title,
                scenes=scenes_dto,
                created_at=script.created_at,
                updated_at=script.updated_at,
            )
        else:
            scenes_dto = []
            for s in script.get("scenes", []):
                dialogues = [DialogueDTO(speaker=d.get("speaker", ""), line=d.get("line", "")) for d in s.get("dialogue", [])]
                scenes_dto.append(SceneDTO(
                    scene_id=s.get("scene_id", ""),
                    characters_in_scene=s.get("characters_in_scene", []),
                    visual_description=s.get("visual_description", ""),
                    action=s.get("action", ""),
                    narration=s.get("narration", ""),
                    image_prompt=s.get("image_prompt"),
                    video_prompt=s.get("video_prompt"),
                    duration_seconds=s.get("duration_seconds"),
                    dialogue=dialogues,
                ))
            return ScriptResponse(
                project_id=script.get("project_id", ""),
                episode=script.get("episode_number", 1),
                title=script.get("title", ""),
                scenes=scenes_dto,
                created_at=script.get("created_at", datetime.now()),
                updated_at=script.get("updated_at", datetime.now()),
            )