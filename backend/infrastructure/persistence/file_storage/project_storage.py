import os
import json
import shutil
from datetime import datetime
from typing import Dict, List, Optional, Any

from ai_anidrama.core.exceptions import ProjectNotFoundError
from ai_anidrama.infrastructure.config.settings import settings


class ProjectStorage:
    PROJECT_FILE = "project.json"
    SOURCE_DIR = "source"
    SCRIPTS_DIR = "scripts"
    ASSETS_DIR = "assets"
    STORYBOARDS_DIR = "storyboards"
    VIDEOS_DIR = "videos"

    def __init__(self):
        self.root = settings.project_root_path
        self.root.mkdir(parents=True, exist_ok=True)

    def get_project_path(self, project_id: str) -> str:
        return str(self.root / project_id)

    def get_project_file_path(self, project_id: str) -> str:
        return str(self.root / project_id / self.PROJECT_FILE)

    def get_source_dir(self, project_id: str) -> str:
        return str(self.root / project_id / self.SOURCE_DIR)

    def get_scripts_dir(self, project_id: str) -> str:
        return str(self.root / project_id / self.SCRIPTS_DIR)

    def get_assets_dir(self, project_id: str) -> str:
        return str(self.root / project_id / self.ASSETS_DIR)

    def get_storyboards_dir(self, project_id: str) -> str:
        return str(self.root / project_id / self.STORYBOARDS_DIR)

    def get_videos_dir(self, project_id: str) -> str:
        return str(self.root / project_id / self.VIDEOS_DIR)

    def project_exists(self, project_id: str) -> bool:
        return os.path.exists(self.get_project_path(project_id))

    def load_project(self, project_id: str) -> Dict[str, Any]:
        if not self.project_exists(project_id):
            raise ProjectNotFoundError(project_id)
        file_path = self.get_project_file_path(project_id)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def save_project(self, project_id: str, data: Dict[str, Any]) -> None:
        project_path = self.get_project_path(project_id)
        os.makedirs(project_path, exist_ok=True)
        file_path = self.get_project_file_path(project_id)
        data["updated_at"] = datetime.now().isoformat()
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def create_project(self, project_id: str, initial_data: Dict[str, Any]) -> None:
        project_path = self.get_project_path(project_id)
        os.makedirs(project_path, exist_ok=True)

        initial_data["project_id"] = project_id
        initial_data["created_at"] = datetime.now().isoformat()
        initial_data["updated_at"] = datetime.now().isoformat()

        file_path = self.get_project_file_path(project_id)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(initial_data, f, ensure_ascii=False, indent=2)

        os.makedirs(self.get_source_dir(project_id), exist_ok=True)
        os.makedirs(self.get_scripts_dir(project_id), exist_ok=True)
        os.makedirs(self.get_assets_dir(project_id), exist_ok=True)

    def delete_project(self, project_id: str) -> None:
        project_path = self.get_project_path(project_id)
        if os.path.exists(project_path):
            shutil.rmtree(project_path)

    def list_projects(self) -> List[str]:
        if not os.path.exists(self.root):
            return []
        return [
            name for name in os.listdir(self.root)
            if os.path.isdir(os.path.join(self.root, name)) and name != ".git"
        ]

    def save_source_file(self, project_id: str, filename: str, content: str) -> None:
        source_dir = self.get_source_dir(project_id)
        os.makedirs(source_dir, exist_ok=True)
        file_path = os.path.join(source_dir, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

    def list_source_files(self, project_id: str) -> List[str]:
        source_dir = self.get_source_dir(project_id)
        if not os.path.exists(source_dir):
            return []
        return os.listdir(source_dir)

    def read_source_file(self, project_id: str, filename: str) -> Optional[str]:
        source_dir = self.get_source_dir(project_id)
        file_path = os.path.join(source_dir, filename)
        if not os.path.exists(file_path):
            return None
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="gbk", errors="replace") as f:
                return f.read()

    def delete_source_file(self, project_id: str, filename: str) -> bool:
        source_dir = self.get_source_dir(project_id)
        file_path = os.path.join(source_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False

    def read_source_files(self, project_id: str, max_chars: int = 15000) -> str:
        source_dir = self.get_source_dir(project_id)
        if not os.path.exists(source_dir):
            return ""
        combined_text = ""
        for filename in sorted(os.listdir(source_dir)):
            filepath = os.path.join(source_dir, filename)
            if os.path.isfile(filepath):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        combined_text += f.read() + "\n\n"
                except Exception:
                    pass
        return combined_text[:max_chars]

    def save_script(self, project_id: str, script_data: Dict[str, Any], filename: str) -> None:
        scripts_dir = self.get_scripts_dir(project_id)
        os.makedirs(scripts_dir, exist_ok=True)
        file_path = os.path.join(scripts_dir, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(script_data, f, ensure_ascii=False, indent=2)

    def load_script(self, project_id: str, filename: str) -> Optional[Dict[str, Any]]:
        scripts_dir = self.get_scripts_dir(project_id)
        file_path = os.path.join(scripts_dir, filename)
        if not os.path.exists(file_path):
            return None
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def list_scripts(self, project_id: str) -> List[str]:
        scripts_dir = self.get_scripts_dir(project_id)
        if not os.path.exists(scripts_dir):
            return []
        return [
            name for name in os.listdir(scripts_dir)
            if name.endswith(".json")
        ]

    def save_asset_image(self, project_id: str, asset_type: str, asset_name: str, image_data: bytes) -> str:
        assets_dir = self.get_assets_dir(project_id)
        asset_dir = os.path.join(assets_dir, asset_type)
        os.makedirs(asset_dir, exist_ok=True)
        filename = f"{asset_name}.png"
        file_path = os.path.join(asset_dir, filename)
        with open(file_path, "wb") as f:
            f.write(image_data)
        return filename

    def list_storyboard_files(self, project_id: str) -> List[str]:
        storyboards_dir = self.get_storyboards_dir(project_id)
        if not os.path.exists(storyboards_dir):
            return []
        return [
            name for name in os.listdir(storyboards_dir)
            if os.path.isfile(os.path.join(storyboards_dir, name)) and name.endswith(".png")
        ]

    def list_video_files(self, project_id: str) -> List[str]:
        videos_dir = self.get_videos_dir(project_id)
        if not os.path.exists(videos_dir):
            return []
        return [
            name for name in os.listdir(videos_dir)
            if os.path.isfile(os.path.join(videos_dir, name)) and name.endswith(".mp4")
        ]