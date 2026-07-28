import httpx
from typing import Dict, Optional

from ai_anidrama.core.exceptions import ProviderError
from ai_anidrama.infrastructure.external.providers.base import BaseProvider, TextProvider, ImageProvider


class KlingTextProvider(TextProvider):
    BASE_URL = "https://api.klingai.com/v1"

    def __init__(self, api_key: str, model: str = "kling-7b"):
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
            raise ProviderError(f"Kling text generation failed: {str(e)}", provider="kling")


class KlingImageProvider(ImageProvider):
    BASE_URL = "https://api.klingai.com/v1"

    def __init__(self, api_key: str, model: str = "kling-image"):
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
            raise ProviderError(f"Kling image generation failed: {str(e)}", provider="kling")


class KlingProvider(BaseProvider):
    provider_name = "kling"

    def __init__(self, api_key: str):
        self.text_provider = KlingTextProvider(api_key)
        self.image_provider = KlingImageProvider(api_key)

    async def generate_text(self, prompt: str, system_prompt: str = "", max_tokens: int = 4000, **kwargs) -> str:
        return await self.text_provider.generate(prompt, system_prompt, max_tokens, **kwargs)

    async def generate_image(self, prompt: str, model: str = "", **kwargs) -> bytes:
        return await self.image_provider.generate(prompt, model, **kwargs)

    async def generate_video(self, prompt: str, model: str = "", **kwargs) -> bytes:
        raise ProviderError("Kling does not support video generation", provider="kling")

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