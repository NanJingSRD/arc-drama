import asyncio
import logging
import os

from ai_anidrama.domain.repositories.task import TaskRepository
from ai_anidrama.domain.services.script_processor import ScriptProcessor
from ai_anidrama.domain.services.asset_extractor import AssetExtractor
from ai_anidrama.infrastructure.external.providers import ProviderFactory
from ai_anidrama.infrastructure.external.queue.task_queue import TaskQueue
from ai_anidrama.infrastructure.persistence.file_storage.project_storage import ProjectStorage
from ai_anidrama.infrastructure.persistence.repositories.project_impl import ProjectRepositoryImpl
from ai_anidrama.infrastructure.persistence.repositories.script_impl import ScriptRepositoryImpl

logger = logging.getLogger(__name__)


class TaskWorker:
    def __init__(self, task_queue: TaskQueue, task_repo: TaskRepository):
        self.task_queue = task_queue
        self.task_repo = task_repo
        self.project_storage = ProjectStorage()
        self.project_repo = ProjectRepositoryImpl(self.project_storage)
        self.script_repo = ScriptRepositoryImpl(self.project_storage)
        self._running = False
        self._lock = asyncio.Lock()

    async def start(self):
        self._running = True
        logger.info("Task worker started")
        while self._running:
            try:
                tasks = await self.task_repo.get_pending_tasks()
                for task in tasks:
                    async with self._lock:
                        await self.process_task(task)
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Error in task worker loop: {e}")
                await asyncio.sleep(5)

    async def stop(self):
        logger.info("Task worker stopped")

    async def process_task(self, task):
        try:
            await self.task_queue.update_task_status(task.task_id, "processing", 0.1, "开始处理任务")
            if task.task_type == "script_process":
                await self._process_script_process(task)
            elif task.task_type == "auto_assets":
                await self._process_auto_assets(task)
            elif task.task_type == "character":
                await self._process_character(task)
            elif task.task_type == "scene":
                await self._process_scene(task)
            elif task.task_type == "prop":
                await self._process_prop(task)
            elif task.task_type == "storyboard":
                await self._process_storyboard(task)
            elif task.task_type == "video":
                await self._process_video(task)
            else:
                await self.task_queue.fail_task(task.task_id, f"Unknown task type: {task.task_type}")
        except Exception as e:
            logger.error(f"Task {task.task_id} failed: {e}")
            await self.task_queue.fail_task(task.task_id, str(e))

    async def _process_script_process(self, task):
        await self.task_queue.update_task_status(task.task_id, "processing", 0.2, "读取源文件")
        source_text = self.project_storage.read_source_files(task.project_id)
        if not source_text:
            await self.task_queue.fail_task(task.task_id, "No source files found")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.3, "调用AI生成剧本")
        provider = ProviderFactory.get("srd")
        if not provider:
            await self.task_queue.fail_task(task.task_id, "Provider not configured")
            return

        episodes_count = task.payload.get("episodes_count", 0)
        episodes_count_text = f"共{episodes_count}集" if episodes_count > 0 else "根据内容长度自动分集"
        project = await self.project_repo.get_by_id(task.project_id)
        title = project.title if project else ""
        style = project.style if project else ""

        SYSTEM_PROMPT = """你是一位专业的动画剧本编剧。你的任务是根据小说内容生成结构化JSON剧本。
【JSON格式要求】
1. 必须输出合法的JSON格式，不要输出任何额外解释或markdown
2. 所有字符串必须使用英文双引号包裹
3. 对象和数组元素之间必须有逗号分隔，最后一个元素后不要加逗号
4. 如果描述文本中包含对话内容需要引用，请使用中文引号「」而非英文双引号，例如："黛玉说道：「花落知多少」"
5. 如果必须使用英文双引号，请务必转义为 \\"
6. 确保JSON可以被标准JSON解析器正确解析
7. 直接输出纯JSON文本，不要添加 ```json 标记"""

        prompt = f"""请根据以下小说内容，生成多集动画剧本JSON数据。
【项目信息】
项目标题：{title}
风格：{style}
集数要求：{episodes_count_text}
【小说原文】
{source_text}
【输出JSON格式要求】
严格按照以下结构输出，场景必须是数组的直接元素，不要用 scene_01、scene_02 等键包裹！
{{
  "title": "剧本总标题",
  "episodes": [
      {{
          "episode_number": 1,
          "title": "第1集标题",
          "scenes": [
              {{
                  "scene_id": "S01",
                  "characters_in_scene": ["角色名1", "角色名2"],
                  "visual_description": "场景画面描述：角色姿态、环境元素、光影氛围（中文，叙事式）",
                  "action": "动作描述：仅描述物理可观察的动作（中文）",
                  "dialogue": [
                    {{"speaker": "角色名", "line": "台词内容"}}
                  ],
                  "narration": "旁白/内心独白：从原文叙述部分转化而来的画外音或内心活动"
              }}
          ]
      }}
  ]
}}
【格式规则】
1. scenes 数组中的每个元素必须是一个对象，直接包含 scene_id、characters_in_scene、visual_description、action、dialogue、narration 字段
2. 禁止使用 scene_01、scene_02 等作为键名包裹场景对象
3. 字段名必须严格使用以下名称（大小写敏感）：
   - scene_id（字符串）
   - characters_in_scene（字符串数组）
   - visual_description（字符串）
   - action（字符串）
   - dialogue（对象数组，每个对象包含 speaker 和 line）
   - narration（字符串）
4. 不要添加任何额外字段
【剧本创作规则】
1. 分集规则：
   - 每集时长建议30-60秒
   - 每集包含完整的起承转合
   - 确保剧情连贯，完整覆盖原文所有情节
   - 关键情节和转折点必须保留
2. 场景规则：
   - scene_id从S01开始递增（S01, S02, ...），每集独立编号
   - 每集最少不少于4个场景
3. 内容保留规则：
   - 原文有对话时必须完整保留在dialogue中，不得删减或改写台词内容
   - 原文中的叙述性文字、心理描写、环境描写必须完整保留，转化为visual_description、action或narration
   - 角色一致性：保留原文中的所有角色，角色名称和性格特征必须与原文一致
4. 只输出纯JSON，不要用```json包裹"""

        raw_text = await provider.generate_text(prompt, SYSTEM_PROMPT, max_tokens=12000)
        await self.task_queue.update_task_status(task.task_id, "processing", 0.7, "解析剧本输出")
        script_data = ScriptProcessor.parse_script_output(raw_text)
        scripts = ScriptProcessor.create_scripts(task.project_id, script_data)

        await self.task_queue.update_task_status(task.task_id, "processing", 0.8, "保存剧本")
        saved_files = []
        for script in scripts:
            filename = f"episode_{script.episode_number}.json"
            script_dict = {
                "title": script.title,
                "episode_number": script.episode_number,
                "scenes": [{
                    "scene_id": s.scene_id,
                    "characters_in_scene": s.characters_in_scene,
                    "visual_description": s.visual_description,
                    "action": s.action,
                    "dialogue": [{"speaker": d.speaker, "line": d.line} for d in s.dialogue],
                    "narration": s.narration,
                } for s in script.scenes],
            }
            self.project_storage.save_script(task.project_id, script_dict, filename)
            saved_files.append(filename)
            if project:
                project.add_episode(script.episode_number, script.title, filename)
                project.updated_at = project.created_at
                await self.project_repo.update(project)

        await self.task_queue.complete_task(task.task_id, {
            "scripts_count": len(scripts),
            "saved_files": saved_files,
        })

    async def _process_auto_assets(self, task):
        await self.task_queue.update_task_status(task.task_id, "processing", 0.2, "读取剧本")
        scripts = await self.script_repo.get_all(task.project_id)
        if not scripts:
            await self.task_queue.fail_task(task.task_id, "No scripts found")
            return

        script_dicts = []
        for script in scripts:
            script_dicts.append({
                "episodes": [{
                    "scenes": [s.to_dict() for s in script.scenes]
                }],
            })

        asset_type = task.payload.get("asset_type", "all")
        await self.task_queue.update_task_status(task.task_id, "processing", 0.5, "提取资产")

        characters = []
        scenes = []
        props = []

        if asset_type in ["all", "character"]:
            characters = AssetExtractor.extract_characters(task.project_id, script_dicts)
        if asset_type in ["all", "scene"]:
            scenes = AssetExtractor.extract_scenes(task.project_id, script_dicts)
        if asset_type in ["all", "prop"]:
            props = AssetExtractor.extract_props(task.project_id, script_dicts)

        await self.task_queue.update_task_status(task.task_id, "processing", 0.8, "保存资产")
        project = await self.project_repo.get_by_id(task.project_id)
        if project:
            for char in characters:
                project.add_character(char.name, char.description, char.voice_style)
            for scene in scenes:
                project.add_scene(scene.name, scene.description)
            for prop in props:
                project.add_prop(prop.name, prop.description)
            await self.project_repo.update(project)

        await self.task_queue.complete_task(task.task_id, {
            "characters_count": len(characters),
            "scenes_count": len(scenes),
            "props_count": len(props),
        })

    async def _process_character(self, task):
        project = await self.project_repo.get_by_id(task.project_id)
        if not project:
            await self.task_queue.fail_task(task.task_id, "Project not found")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.3, "获取角色信息")
        char_data = project.characters.get(task.resource_id)
        if not char_data:
            await self.task_queue.fail_task(task.task_id, "Character not found")
            return

        prompt = task.payload.get("prompt") or char_data.get("description", "")
        if not prompt:
            await self.task_queue.fail_task(task.task_id, "No prompt provided")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.5, "生成角色设计图")
        provider = ProviderFactory.get("srd")
        if not provider:
            await self.task_queue.fail_task(task.task_id, "Provider not configured")
            return

        image_data = await provider.generate_image(prompt, model="qwen-image-2512")
        await self.task_queue.update_task_status(task.task_id, "processing", 0.8, "保存设计图")
        filename = self.project_storage.save_asset_image(task.project_id, "characters", task.resource_id, image_data)

        if project:
            project.characters[task.resource_id]["image_url"] = f"/static/projects/{task.project_id}/assets/characters/{filename}"
            project.characters[task.resource_id]["image_prompt"] = prompt
            await self.project_repo.update(project)

        await self.task_queue.complete_task(task.task_id, {
            "filename": filename,
            "image_url": f"/static/projects/{task.project_id}/assets/characters/{filename}",
        })

    async def _process_scene(self, task):
        project = await self.project_repo.get_by_id(task.project_id)
        if not project:
            await self.task_queue.fail_task(task.task_id, "Project not found")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.3, "获取场景信息")
        scene_data = project.scenes.get(task.resource_id)
        if not scene_data:
            await self.task_queue.fail_task(task.task_id, "Scene not found")
            return

        prompt = task.payload.get("prompt") or scene_data.get("description", "")
        if not prompt:
            await self.task_queue.fail_task(task.task_id, "No prompt provided")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.5, "生成场景设计图")
        provider = ProviderFactory.get("srd")
        if not provider:
            await self.task_queue.fail_task(task.task_id, "Provider not configured")
            return

        image_data = await provider.generate_image(prompt, model="qwen-image-2512")
        await self.task_queue.update_task_status(task.task_id, "processing", 0.8, "保存设计图")
        filename = self.project_storage.save_asset_image(task.project_id, "scenes", task.resource_id, image_data)

        if project:
            project.scenes[task.resource_id]["image_url"] = f"/static/projects/{task.project_id}/assets/scenes/{filename}"
            project.scenes[task.resource_id]["image_prompt"] = prompt
            await self.project_repo.update(project)

        await self.task_queue.complete_task(task.task_id, {
            "filename": filename,
            "image_url": f"/static/projects/{task.project_id}/assets/scenes/{filename}",
        })

    async def _process_prop(self, task):
        project = await self.project_repo.get_by_id(task.project_id)
        if not project:
            await self.task_queue.fail_task(task.task_id, "Project not found")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.3, "获取道具信息")
        prop_data = project.props.get(task.resource_id)
        if not prop_data:
            await self.task_queue.fail_task(task.task_id, "Prop not found")
            return

        prompt = task.payload.get("prompt") or prop_data.get("description", "")
        if not prompt:
            await self.task_queue.fail_task(task.task_id, "No prompt provided")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.5, "生成道具设计图")
        provider = ProviderFactory.get("srd")
        if not provider:
            await self.task_queue.fail_task(task.task_id, "Provider not configured")
            return

        image_data = await provider.generate_image(prompt, model="qwen-image-2512")
        await self.task_queue.update_task_status(task.task_id, "processing", 0.8, "保存设计图")
        filename = self.project_storage.save_asset_image(task.project_id, "props", task.resource_id, image_data)

        if project:
            project.props[task.resource_id]["image_url"] = f"/static/projects/{task.project_id}/assets/props/{filename}"
            project.props[task.resource_id]["image_prompt"] = prompt
            await self.project_repo.update(project)

        await self.task_queue.complete_task(task.task_id, {
            "filename": filename,
            "image_url": f"/static/projects/{task.project_id}/assets/props/{filename}",
        })

    async def _process_storyboard(self, task):
        await self.task_queue.update_task_status(task.task_id, "processing", 0.2, "获取剧本")
        script = await self.script_repo.get_by_episode(
            task.project_id, task.payload.get("episode_number")
        )
        if not script:
            await self.task_queue.fail_task(task.task_id, "Script not found")
            return

        scene = script.get_scene(task.payload.get("scene_id"))
        if not scene:
            await self.task_queue.fail_task(task.task_id, "Scene not found")
            return

        prompt = task.payload.get("prompt") or scene.visual_description
        if not prompt:
            await self.task_queue.fail_task(task.task_id, "No prompt provided")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.5, "生成分镜图")
        provider = ProviderFactory.get("srd")
        if not provider:
            await self.task_queue.fail_task(task.task_id, "Provider not configured")
            return

        image_data = await provider.generate_image(prompt, model="qwen-image-2512")
        await self.task_queue.update_task_status(task.task_id, "processing", 0.8, "保存分镜图")
        scene_name = f"{task.payload.get('episode_number')}_{task.payload.get('scene_id')}"
        filename = self.project_storage.save_asset_image(task.project_id, "storyboards", scene_name, image_data)

        await self.task_queue.complete_task(task.task_id, {
            "filename": filename,
            "image_url": f"/static/projects/{task.project_id}/assets/storyboards/{filename}",
        })

    async def _process_video(self, task):
        project = await self.project_repo.get_by_id(task.project_id)
        if not project:
            await self.task_queue.fail_task(task.task_id, "Project not found")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.3, "获取剧本")
        script = await self.script_repo.get_by_episode(
            task.project_id, task.payload.get("episode_number")
        )
        if not script:
            await self.task_queue.fail_task(task.task_id, "Script not found")
            return

        scene = script.get_scene(task.payload.get("scene_id"))
        if not scene:
            await self.task_queue.fail_task(task.task_id, "Scene not found")
            return

        prompt = task.payload.get("prompt") or scene.visual_description
        if not prompt:
            await self.task_queue.fail_task(task.task_id, "No prompt provided")
            return

        await self.task_queue.update_task_status(task.task_id, "processing", 0.5, "生成视频")
        provider = ProviderFactory.get("srd")
        if not provider:
            await self.task_queue.fail_task(task.task_id, "Provider not configured")
            return

        video_data = await provider.generate_video(prompt, model="qwen-video")
        await self.task_queue.update_task_status(task.task_id, "processing", 0.8, "保存视频")
        scene_name = f"{task.payload.get('episode_number')}_{task.payload.get('scene_id')}"
        video_filename = f"{scene_name}.mp4"
        assets_dir = self.project_storage.get_assets_dir(task.project_id)
        videos_dir = os.path.join(assets_dir, "videos")
        os.makedirs(videos_dir, exist_ok=True)
        video_path = os.path.join(videos_dir, video_filename)

        with open(video_path, "wb") as f:
            f.write(video_data)

        await self.task_queue.complete_task(task.task_id, {
            "filename": video_filename,
            "video_url": f"/static/projects/{task.project_id}/assets/videos/{video_filename}",
        })