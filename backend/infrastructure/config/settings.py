import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    project_root: str = os.path.join(os.getcwd(), "projects")
    static_dir: str = os.path.join(os.getcwd(), "static")
    database_url: str = ""

    auth_username: str = "admin"
    auth_password: str = "password"
    auth_token_secret: str = "videogen-secret-key-keep-it-safe"
    auth_token_expire_minutes: int = 1440
    auth_enabled: bool = True
    jwt_secret_key: str = ""
    admin_users: str = ""

    default_provider: str = "srd"
    default_text_model: str = "minimax-m2.7"
    default_image_model: str = "qwen-image-2512"
    default_video_model: str = "qwen-video"

    srd_api_key: str = ""
    srd_api_base_url: str = ""
    srd_image_api_key: str = ""
    srd_image_api_base_url: str = ""

    max_source_chars: int = 15000
    max_script_output_tokens: int = 12000
    enable_sandbox: bool = True

    @property
    def project_root_path(self) -> Path:
        return Path(self.project_root).resolve()

    def database_path(self) -> Path:
        return Path(self.database_url.replace("sqlite+aiosqlite:///", "")).resolve()


settings = Settings()

if not settings.database_url:
    db_dir = Path(os.getcwd()) / "projects"
    db_dir.mkdir(parents=True, exist_ok=True)
    db_path = (db_dir / ".videogen.db").as_posix()
    settings.database_url = f"sqlite+aiosqlite:///{db_path}"