"""通用验证器"""

from typing import Callable


def validate_backend_value(value: str, backend_key: str, _t: Callable[..., str]) -> None:
    """验证 backend 值格式。

    格式应为 provider/model_id 或空串（自动解析）。
    """
    if not value:
        return

    parts = value.split("/", 1)
    if len(parts) != 2:
        raise ValueError(f"{backend_key} 格式应为 provider/model_id")