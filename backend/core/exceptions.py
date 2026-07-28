from typing import Optional


class VideoGenError(Exception):
    """Base exception for all VideoGen errors"""

    def __init__(self, message: str, code: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.code = code


class ProjectNotFoundError(VideoGenError):
    """Raised when a project is not found"""

    def __init__(self, project_id: str):
        super().__init__(f"Project '{project_id}' not found", code="project_not_found")
        self.project_id = project_id


class ScriptNotFoundError(VideoGenError):
    """Raised when a script is not found"""

    def __init__(self, project_id: str, episode_number: int):
        super().__init__(
            f"Script episode {episode_number} not found in project '{project_id}'",
            code="script_not_found",
        )
        self.episode_number = episode_number


class AssetNotFoundError(VideoGenError):
    """Raised when an asset is not found"""

    def __init__(self, project_id: str, asset_type: str, asset_name: str):
        super().__init__(
            f"{asset_type} '{asset_name}' not found in project '{project_id}'",
            code="asset_not_found",
        )
        self.asset_type = asset_type
        self.asset_name = asset_name


class ValidationError(VideoGenError):
    """Raised when validation fails"""

    def __init__(self, message: str):
        super().__init__(message, code="validation_error")


class GenerationError(VideoGenError):
    """Raised when generation fails"""

    def __init__(self, message: str, task_id: Optional[str] = None):
        super().__init__(message, code="generation_error")
        self.task_id = task_id


class ProviderError(VideoGenError):
    """Raised when a provider operation fails"""

    def __init__(self, message: str, provider: Optional[str] = None):
        super().__init__(message, code="provider_error")
        self.provider = provider


class AuthenticationError(VideoGenError):
    """Raised when authentication fails"""

    def __init__(self, message: str):
        super().__init__(message, code="authentication_error")


class AuthorizationError(VideoGenError):
    """Raised when authorization fails"""

    def __init__(self, message: str):
        super().__init__(message, code="authorization_error")