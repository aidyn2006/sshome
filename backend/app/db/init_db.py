from app.db.base import Base
from app.db.session import engine
from app.models.audit_log import AuditLog
from app.models.refresh_token import RefreshToken
from app.models.user import User


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
