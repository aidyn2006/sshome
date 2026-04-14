from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.audit_log import AuditLogAction


class AuditLogOut(BaseModel):
    id: UUID
    user_id: UUID | None
    action: AuditLogAction
    timestamp: datetime
    ip_address: str | None

    model_config = {"from_attributes": True}
