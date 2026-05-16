from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from app.db.session import engine


LEGACY_PATCH_REVISIONS = {
    "20260508_0002",
    "20260513_0003",
    "20260513_0004",
    "20260513_0005",
}
LEGACY_DEVICE_COLUMNS = {
    "hardware_id",
    "device_secret_hash",
    "battery_level",
    "last_error",
    "last_seen_at",
    "telemetry",
}


def _patch_legacy_schema() -> None:
    statements = [
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS hardware_id VARCHAR(64)",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_secret_hash VARCHAR(64)",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS battery_level INTEGER",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_error TEXT",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ",
        "ALTER TABLE devices ADD COLUMN IF NOT EXISTS telemetry JSON",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_devices_hardware_id ON devices (hardware_id)",
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_type') THEN
                ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'CAMERA';
                ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'MOTION';
            END IF;
        END $$;
        """,
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_action') THEN
                ALTER TYPE audit_log_action ADD VALUE IF NOT EXISTS 'ADMIN_DEVICE_GENERATED';
                ALTER TYPE audit_log_action ADD VALUE IF NOT EXISTS 'ADMIN_USER_ROLE_CHANGED';
            END IF;
        END $$;
        """,
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
        has_users = inspector.has_table("users")
        device_columns = {column["name"] for column in inspector.get_columns("devices")} if has_devices else set()
        current_revision = (
            connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
            if has_alembic_version
            else None
        )

    has_missing_device_columns = has_devices and not LEGACY_DEVICE_COLUMNS.issubset(device_columns)

    if has_devices and not has_alembic_version:
        if not has_users:
            command.stamp(alembic_cfg, "20260415_0001")
            command.upgrade(alembic_cfg, "20260508_0002")
        _patch_legacy_schema()
        command.stamp(alembic_cfg, "head")
        return

    if has_devices and (has_missing_device_columns or current_revision in LEGACY_PATCH_REVISIONS):
        _patch_legacy_schema()
        command.stamp(alembic_cfg, "head")
        return

    command.upgrade(alembic_cfg, "head")
