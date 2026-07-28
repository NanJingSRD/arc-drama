from typing import List, Optional, Protocol

from ai_anidrama.domain.entities.project import Project


class ProjectRepository(Protocol):
    async def get_by_id(self, project_id: str) -> Optional[Project]:
        ...

    async def get_all(self) -> List[Project]:
        ...

    async def create(self, project: Project) -> Project:
        ...

    async def update(self, project: Project) -> Project:
        ...

    async def delete(self, project_id: str) -> None:
        ...

    async def exists(self, project_id: str) -> bool:
        ...