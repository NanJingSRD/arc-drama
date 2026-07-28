from abc import ABC, abstractmethod
from typing import Dict, Optional, Any


class BaseProvider(ABC):
    provider_name: str

    @abstractmethod
    async def generate_text(self, prompt: str, system_prompt: str = "", max_tokens: int = 4000, **kwargs) -> str:
        ...

    @abstractmethod
    async def generate_image(self, prompt: str, model: str = "", **kwargs) -> bytes:
        ...

    @abstractmethod
    async def generate_video(self, prompt: str, model: str = "", **kwargs) -> bytes:
        ...

    @abstractmethod
    async def test_connection(self) -> bool:
        ...


class TextProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str = "", max_tokens: int = 4000, **kwargs) -> str:
        ...


class ImageProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, model: str = "", **kwargs) -> bytes:
        ...


class VideoProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, model: str = "", **kwargs) -> bytes:
        ...


class ProviderFactory:
    _providers: Dict[str, BaseProvider] = {}

    @classmethod
    def register(cls, name: str, provider: BaseProvider):
        cls._providers[name] = provider

    @classmethod
    def get(cls, name: str) -> Optional[BaseProvider]:
        return cls._providers.get(name)

    @classmethod
    def list_providers(cls) -> list[str]:
        return list(cls._providers.keys())