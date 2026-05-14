from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from app.db.session import engine


def _patch_legacy_device_schema() -> None:
    statements = [
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS hardware_id VARCHAR(64)",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_secret_hash VARCHAR(64)",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS battery_level INTEGER",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_error TEXT",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS telemetry JSON",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_devices_hardware_id ON devices (hardware_id)",
        "ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'CAMERA'",
        "ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'MOTION'",
        "ALTER TYPE audit_log_action ADD VALUE IF NOT EXISTS 'ADMIN_DEVICE_GENERATED'",
        "ALTER TYPE audit_log_action ADD VALUE IF NOT EXISTS 'ADMIN_USER_ROLE_CHANGED'",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def init_db() -> None:
    """Bring the local database schema up to date with Alembic."""

    backend_root = Path(__file__).resolve().parents[2]
    alembic_cfg = Config(str(backend_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))

    with engine.connect() as connection:
        inspector = inspect(connection)
        has_alembic_version = inspector.has_table("alembic_version")
        has_devices = inspector.has_table("devices")

    if not has_alembic_version and has_devices:
        _patch_legacy_device_schema()
        command.stamp(alembic_cfg, "head")
        return

    command.upgrade(alembic_cfg, "head")
