import re
from typing import Any, Dict, List, Optional

from ai_anidrama.core.exceptions import ValidationError


def validate_project_id(project_id: str) -> str:
    if not project_id:
        raise ValidationError("Project ID cannot be empty")
    if not re.match(r"^[a-zA-Z0-9-]+$", project_id):
        raise ValidationError(
            "Project ID can only contain letters, numbers, and hyphens"
        )
    if len(project_id) > 64:
        raise ValidationError("Project ID cannot exceed 64 characters")
    return project_id


def validate_project_name(name: str) -> str:
    if not name or not name.strip():
        raise ValidationError("Project name cannot be empty")
    if len(name.strip()) > 255:
        raise ValidationError("Project name cannot exceed 255 characters")
    return name.strip()


def validate_script_content(content: Dict[str, Any]) -> Dict[str, Any]:
    required_fields = ["title", "episode_number", "scenes"]
    for field in required_fields:
        if field not in content:
            raise ValidationError(f"Script missing required field: {field}")
    if not isinstance(content["scenes"], list):
        raise ValidationError("Scenes must be a list")
    for i, scene in enumerate(content["scenes"]):
        if not isinstance(scene, dict):
            raise ValidationError(f"Scene {i} must be a dictionary")
    return content


def validate_asset_name(name: str) -> str:
    if not name or not name.strip():
        raise ValidationError("Asset name cannot be empty")
    if len(name.strip()) > 128:
        raise ValidationError("Asset name cannot exceed 128 characters")
    return name.strip()


def validate_provider_name(name: str) -> str:
    valid_providers = ["ark", "dashscope", "openai", "grok", "kling", "srd"]
    if name not in valid_providers:
        raise ValidationError(f"Invalid provider: {name}. Valid providers: {valid_providers}")
    return name


def validate_image_prompt(prompt: str) -> str:
    if not prompt or not prompt.strip():
        raise ValidationError("Image prompt cannot be empty")
    if len(prompt.strip()) > 4000:
        raise ValidationError("Image prompt cannot exceed 4000 characters")
    return prompt.strip()


def validate_video_prompt(prompt: str) -> str:
    if not prompt or not prompt.strip():
        raise ValidationError("Video prompt cannot be empty")
    if len(prompt.strip()) > 8000:
        raise ValidationError("Video prompt cannot exceed 8000 characters")
    return prompt.strip()