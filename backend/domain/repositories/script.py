from typing import List, Optional, Protocol

from ai_anidrama.domain.entities.script import Script


class ScriptRepository(Protocol):
    async def get_by_episode(self, project_id: str, episode_number: int) -> Optional[Script]:
        ...

    async def get_all(self, project_id: str) -> List[Script]:
        ...

    async def create(self, project_id: str, script: Script) -> Script:
        ...

    async def update(self, script: Script) -> Script:
        ...

    async def delete(self, project_id: str, episode_number: int) -> None:
        ...

    async def exists(self, project_id: str, episode_number: int) -> bool:
        ...