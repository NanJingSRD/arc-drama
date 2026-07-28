import httpx
from typing import Dict, Optional

from ai_anidrama.core.exceptions import ProviderError
from ai_anidrama.infrastructure.external.providers.base import BaseProvider, TextProvider, ImageProvider, VideoProvider


class OpenAITextProvider(TextProvider):
    BASE_URL = "https://api.openai.com/v1"

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
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
                f"{self.BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except Exception as e:
            raise ProviderError(f"OpenAI text generation failed: {str(e)}", provider="openai")


class OpenAIImageProvider(ImageProvider):
    BASE_URL = "https://api.openai.com/v1"

    def __init__(self, api_key: str, model: str = "dall-e-3"):
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
            "prompt": prompt,
            "size": "1024x1024",
        }
        try:
            response = await self.client.post(
                f"{self.BASE_URL}/images/generations",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            image_url = result["data"][0]["url"]
            image_response = await self.client.get(image_url)
            return image_response.content
        except Exception as e:
            raise ProviderError(f"OpenAI image generation failed: {str(e)}", provider="openai")


class OpenAIVideoProvider(VideoProvider):
    BASE_URL = "https://api.openai.com/v1"

    def __init__(self, api_key: str, model: str = "sora"):
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
            "prompt": prompt,
        }
        try:
            response = await self.client.post(
                f"{self.BASE_URL}/videos/generations",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            video_url = result["data"][0]["url"]
            video_response = await self.client.get(video_url)
            return video_response.content
        except Exception as e:
            raise ProviderError(f"OpenAI video generation failed: {str(e)}", provider="openai")


class OpenAIProvider(BaseProvider):
    provider_name = "openai"

    def __init__(self, api_key: str):
        self.text_provider = OpenAITextProvider(api_key)
        self.image_provider = OpenAIImageProvider(api_key)
        self.video_provider = OpenAIVideoProvider(api_key)

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
                    f"{self.text_provider.BASE_URL}/models",
                    headers={"Authorization": f"Bearer {self.text_provider.api_key}"},
                )
                return response.status_code == 200
        except Exception:
            return False