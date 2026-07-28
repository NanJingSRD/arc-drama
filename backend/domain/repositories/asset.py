from typing import List, Optional, Protocol

from ai_anidrama.domain.entities.character import Character
from ai_anidrama.domain.entities.scene import SceneEntity
from ai_anidrama.domain.entities.prop import Prop

class AssetRepository(Protocol):
    async def get_characters(self, project_id: str) -> List[Character]:
        ...

    async def get_character(self, project_id: str, name: str) -> Optional[Character]:
        ...

    async def create_character(self, character: Character) -> Character:
        ...

    async def update_character(self, character: Character) -> Character:
        ...

    async def delete_character(self, project_id: str, name: str) -> None:
        ...

    async def get_scenes(self, project_id: str) -> List[SceneEntity]:
        ...

    async def get_scene(self, project_id: str, name: str) -> Optional[SceneEntity]:
        ...

    async def create_scene(self, scene: SceneEntity) -> SceneEntity:
        ...

    async def update_scene(self, scene: SceneEntity) -> SceneEntity:
        ...

    async def delete_scene(self, project_id: str, name: str) -> None:
        ...

    async def get_props(self, project_id: str) -> List[Prop]:
        ...

    async def get_prop(self, project_id: str, name: str) -> Optional[Prop]:
        ...

    async def create_prop(self, prop: Prop) -> Prop:
        ...

    async def update_prop(self, prop: Prop) -> Prop:
        ...

    async def delete_prop(self, project_id: str, name: str) -> None:
        ...
