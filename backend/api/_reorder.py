"""重排序验证工具。"""

from typing import Optional


def full_permutation_error(existing_ids: list[str], new_ids: list[str]) -> Optional[str]:
    """验证新顺序是否为旧顺序的完整排列。

    Returns:
        None: 验证通过
        "length": 长度不一致
        "duplicate": 存在重复 ID
        "mismatch": ID 集合不匹配
    """
    if len(existing_ids) != len(new_ids):
        return "length"

    seen = set()
    for id in new_ids:
        if id in seen:
            return "duplicate"
        seen.add(id)

    if seen != set(existing_ids):
        return "mismatch"

    return None