import os
import json
import uuid
import hashlib
from datetime import datetime

from typing import Any, Dict, Optional
def generate_task_id() -> str:
    """Generate a unique task ID"""
    return f"task-{uuid.uuid4().hex[:8]}"
def generate_project_id(name: str) -> str:
    """Generate a project ID from name"""
    cleaned = "".join(c for c in name.lower().replace(" ", "-") if c.isalnum() or c == "-")
    hash_suffix = hashlib.md5(name.encode()).hexdigest()[:6]
    return f"{cleaned[:32]}-{hash_suffix}"
def serialize_datetime(dt: datetime) -> str:
    """Serialize datetime to ISO format"""
    return dt.isoformat()
def deserialize_datetime(dt_str: str) -> datetime:
    """Deserialize ISO format string to datetime"""
    return datetime.fromisoformat(dt_str)
def read_json_file(file_path: str) -> Dict[str, Any]:
    """Read JSON file with UTF-8 encoding"""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)
def write_json_file(file_path: str, data: Dict[str, Any]) -> None:
    """Write JSON file with UTF-8 encoding and indentation"""
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
def ensure_directory_exists(dir_path: str) -> None:
    """Ensure directory exists, create if not"""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
def get_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()
def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """Truncate text to max_length with suffix"""
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix
def normalize_filename(filename: str) -> str:
    """Normalize filename by replacing invalid characters"""
    return re.sub(r'[\\/:*?"<>|]', "_", filename)
import re
def extract_episode_number(filename: str) -> Optional[int]:
    """Extract episode number from filename like 'episode_1.json'"""
    match = re.search(r"episode_(\d+)\.json", filename)
    if match:
        return int(match.group(1))
    return None


def render_failure(message: str, translate: callable) -> str:
    """Render failure message for display"""
    return message
