import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import engine


def init_db() -> None:
    """Fallback helper for local experiments.

    Production schema management should go through Alembic migrations.
    """

    Base.metadata.create_all(bind=engine)
