from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog, AuditLogAction


def log_action(
    db: Session,
    action: AuditLogAction,
    user_id: UUID | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    log = AuditLog(user_id=user_id, action=action, ip_address=ip_address)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
