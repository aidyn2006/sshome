from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AuthContext(BaseModel):
    owner_id: UUID
    subject: str | None = None
    roles: list[str] = Field(default_factory=list)
    token_type: str | None = None
    auth_mode: Literal["jwt", "introspection"]
    claims: dict[str, Any] = Field(default_factory=dict, exclude=True)
