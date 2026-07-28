from typing import Optional
from ai_anidrama.infrastructure.external.providers.base import BaseProvider, ProviderFactory, TextProvider, ImageProvider, VideoProvider
from ai_anidrama.infrastructure.external.providers.srd_provider import SRDProvider
from ai_anidrama.infrastructure.external.providers.ark_provider import ArkProvider
from ai_anidrama.infrastructure.external.providers.dashscope_provider import DashscopeProvider
from ai_anidrama.infrastructure.external.providers.openai_provider import OpenAIProvider
from ai_anidrama.infrastructure.external.providers.grok_provider import GrokProvider
from ai_anidrama.infrastructure.external.providers.kling_provider import KlingProvider

DEFAULT_PROVIDERS = {
    "srd": SRDProvider,
    "ark": ArkProvider,
    "dashscope": DashscopeProvider,
    "openai": OpenAIProvider,
    "grok": GrokProvider,
    "kling": KlingProvider,
}

PROVIDER_METADATA = {
    "srd": {
        "display_name": "斯锐德",
        "description": "私有化部署图文大模型算力平台，兼容标准 OpenAI 接口，支持文案创作、图像解析、AI 视觉生成全场景。",
    },
    "ark": {
        "display_name": "火山方舟",
        "description": "字节跳动火山方舟 AI 平台，支持 Seedance 视频生成和 Seedream 图片生成，具备音频生成和种子控制能力。",
    },
    "dashscope": {
        "display_name": "阿里百炼",
        "description": "阿里云百炼（Model Studio）全模态平台，支持 Qwen 文本、Qwen-Image / 万相图像与 HappyHorse / 万相视频（含参考生视频）。",
    },
    "openai": {
        "display_name": "OpenAI",
        "description": "OpenAI 官方平台，支持 GPT-5.4 文本、GPT Image 图片和 Sora 视频生成。",
    },
    "grok": {
        "display_name": "Grok",
        "description": "xAI Grok 模型，支持视频和图片生成。",
    },
    "kling": {
        "display_name": "可灵 Kling",
        "description": "快手可灵 Kling 视频与图像生成平台，使用 Access Key 与 Secret Key 鉴权。",
    },
}


def initialize_providers(credentials: Optional[dict] = None, base_urls: Optional[dict] = None):
    credentials = credentials or {}
    base_urls = base_urls or {}
    for name, provider_class in DEFAULT_PROVIDERS.items():
        api_key = credentials.get(name)
        if api_key:
            base_url = base_urls.get(name, "")
            if name == "srd":
                image_api_key = credentials.get("srd_image") or api_key
                image_base_url = base_urls.get("srd_image") or base_url
                ProviderFactory.register(name, provider_class(api_key, base_url=base_url, image_api_key=image_api_key, image_base_url=image_base_url))
            else:
                ProviderFactory.register(name, provider_class(api_key))