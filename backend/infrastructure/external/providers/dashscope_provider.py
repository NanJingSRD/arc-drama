import httpx
from typing import Dict, Optional

from ai_anidrama.core.exceptions import ProviderError
from ai_anidrama.infrastructure.external.providers.base import BaseProvider, TextProvider, ImageProvider, VideoProvider


class DashscopeTextProvider(TextProvider):
    BASE_URL = "https://dashscope.aliyuncs.com/api/v1"

    def __init__(self, api_key: str, model: str = "qwen-max"):
        self.api_key = api_key
        self.model = model
        self.client = httpx.AsyncClient(timeout=120.0)

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
                f"{self.BASE_URL}/services/aigc/text-generation/generation",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            return result["output"]["text"]
        except Exception as e:
            raise ProviderError(f"Dashscope text generation failed: {str(e)}", provider="dashscope")


class DashscopeImageProvider(ImageProvider):
    BASE_URL = "https://dashscope.aliyuncs.com/api/v1"

    def __init__(self, api_key: str, model: str = "wanx-v2"):
        self.api_key = api_key
        self.model = model
        self.client = httpx.AsyncClient(timeout=120.0)

    async def generate(self, prompt: str, model: str = "", **kwargs) -> bytes:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or self.model,
            "input": {"prompt": prompt},
            "parameters": {"size": "1024x1024"},
        }
        try:
            response = await self.client.post(
                f"{self.BASE_URL}/services/aigc/image-generation/generation",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            image_url = result["output"]["url"]
            image_response = await self.client.get(image_url)
            return image_response.content
        except Exception as e:
            raise ProviderError(f"Dashscope image generation failed: {str(e)}", provider="dashscope")


class DashscopeVideoProvider(VideoProvider):
    BASE_URL = "https://dashscope.aliyuncs.com/api/v1"

    def __init__(self, api_key: str, model: str = "video-v1"):
        self.api_key = api_key
        self.model = model
        self.client = httpx.AsyncClient(timeout=300.0)

    async def generate(self, prompt: str, model: str = "", **kwargs) -> bytes:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model or self.model,
            "input": {"prompt": prompt},
            "parameters": {"duration": kwargs.get("duration", 10)},
        }
        try:
            response = await self.client.post(
                f"{self.BASE_URL}/services/aigc/video-generation/generation",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            video_url = result["output"]["url"]
            video_response = await self.client.get(video_url)
            return video_response.content
        except Exception as e:
            raise ProviderError(f"Dashscope video generation failed: {str(e)}", provider="dashscope")


class DashscopeProvider(BaseProvider):
    provider_name = "dashscope"

    def __init__(self, api_key: str):
        self.text_provider = DashscopeTextProvider(api_key)
        self.image_provider = DashscopeImageProvider(api_key)
        self.video_provider = DashscopeVideoProvider(api_key)

    async def generate_text(self, prompt: str, system_prompt: str = "", max_tokens: int = 4000, **kwargs) -> str:
        return await self.text_provider.generate(prompt, system_prompt, max_tokens, **kwargs)

    async def generate_image(self, prompt: str, model: str = "", **kwargs) -> bytes:
        return await self.image_provider.generate(prompt, model, **kwargs)

    async def generate_video(self, prompt: str, model: str = "", **kwargs) -> bytes:
        return await self.video_provider.generate(prompt, model, **kwargs)

    async def test_connection(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.text_provider.BASE_URL}/services/aigc/text-generation/models",
                    headers={"Authorization": f"Bearer {self.text_provider.api_key}"},
                )
                return response.status_code == 200
        except Exception:
            return False