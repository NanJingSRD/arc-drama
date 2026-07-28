import httpx
from typing import Dict, Optional

from ai_anidrama.core.exceptions import ProviderError
from ai_anidrama.infrastructure.external.providers.base import BaseProvider, TextProvider, ImageProvider, VideoProvider


class SRDTextProvider(TextProvider):
    DEFAULT_BASE_URL = ""

    def __init__(self, api_key: str, model: str = "minimax-m2.7", base_url: str = ""):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.client = httpx.AsyncClient(timeout=1200.0)

    async def generate(self, prompt: str, system_prompt: str = "", max_tokens: int = 4000, **kwargs) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
        }
        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except Exception as e:
            raise ProviderError(f"SRD text generation failed: {str(e)}", provider="srd")


class SRDImageProvider(ImageProvider):
    DEFAULT_API_KEY = ""
    DEFAULT_BASE_URL = ""

    def __init__(self, api_key: str = "", model: str = "qwen-image-2512", base_url: str = ""):
        self.api_key = api_key or self.DEFAULT_API_KEY
        self.model = model
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.client = httpx.AsyncClient(timeout=1200.0)

    async def generate(self, prompt: str, model: str = "", **kwargs) -> bytes:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or self.model,
            "prompt": prompt,
            "size": "1024x1024",
        }
        try:
            response = await self.client.post(
                f"{self.base_url}/images/generations",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            image_url = result["data"][0]["url"]
            image_response = await self.client.get(image_url)
            return image_response.content
        except Exception as e:
            raise ProviderError(f"SRD image generation failed: {str(e)}", provider="srd")


class SRDVideoProvider(VideoProvider):
    DEFAULT_BASE_URL = ""

    def __init__(self, api_key: str, model: str = "qwen-video", base_url: str = ""):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url or self.DEFAULT_BASE_URL
        self.client = httpx.AsyncClient(timeout=300.0)

    async def generate(self, prompt: str, model: str = "", **kwargs) -> bytes:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or self.model,
            "prompt": prompt,
            "duration": kwargs.get("duration", 10),
        }
        try:
            response = await self.client.post(
                f"{self.base_url}/videos/generations",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            video_url = result["data"][0]["url"]
            video_response = await self.client.get(video_url)
            return video_response.content
        except Exception as e:
            raise ProviderError(f"SRD video generation failed: {str(e)}", provider="srd")


class SRDProvider(BaseProvider):
    provider_name = "srd"

    def __init__(self, api_key: str, base_url: str = "", image_api_key: str = "", image_base_url: str = ""):
        self.text_provider = SRDTextProvider(api_key, base_url=base_url)
        self.image_provider = SRDImageProvider(image_api_key or api_key, base_url=image_base_url or base_url)
        self.video_provider = SRDVideoProvider(api_key, base_url=base_url)

    async def generate_text(self, prompt: str, system_prompt: str = "", max_tokens: int = 4000, **kwargs) -> str:
        return await self.text_provider.generate(prompt, system_prompt, max_tokens, **kwargs)

    async def generate_image(self, prompt: str, model: str = "", **kwargs) -> bytes:
        return await self.image_provider.generate(prompt, model, **kwargs)

    async def generate_video(self, prompt: str, model: str = "", **kwargs) -> bytes:
        return await self.video_provider.generate(prompt, model, **kwargs)

    async def test_connection(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.text_provider.base_url}/models")
                return response.status_code == 200
        except Exception:
            return False