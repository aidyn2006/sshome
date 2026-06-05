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
LEGACY_USER_COLUMNS = {
    "favorite_device_ids",
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
        """
        CREATE TABLE IF NOT EXISTS password_reset_codes (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            code_hash VARCHAR(128) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_password_reset_codes_user_id ON password_reset_codes (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_password_reset_codes_code_hash ON password_reset_codes (code_hash)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_device_ids JSON",
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attack_type') THEN
                CREATE TYPE attack_type AS ENUM ('MQTT_SPOOFING', 'BRUTE_FORCE', 'REPLAY', 'DDOS');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'security_severity') THEN
                CREATE TYPE security_severity AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
            END IF;
        END $$;
        """,
        """
        CREATE TABLE IF NOT EXISTS security_events (
            id UUID PRIMARY KEY,
            attack_type attack_type NOT NULL,
            blocked BOOLEAN NOT NULL DEFAULT TRUE,
            severity security_severity NOT NULL DEFAULT 'INFO',
            target VARCHAR(255),
            source_ip VARCHAR(45),
            message VARCHAR(500) NOT NULL,
            sim_id VARCHAR(64),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            detail JSON,
            created_at TIMESTAMPTZ NOT NULL
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_security_events_attack_type ON security_events (attack_type)",
        "CREATE INDEX IF NOT EXISTS ix_security_events_sim_id ON security_events (sim_id)",
        "CREATE INDEX IF NOT EXISTS ix_security_events_created_at ON security_events (created_at)",
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
        user_columns = {column["name"] for column in inspector.get_columns("users")} if has_users else set()
        current_revision = (
            connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
            if has_alembic_version
            else None
        )

    has_missing_device_columns = has_devices and not LEGACY_DEVICE_COLUMNS.issubset(device_columns)
    has_missing_user_columns = has_users and not LEGACY_USER_COLUMNS.issubset(user_columns)

    if has_devices and not has_alembic_version:
        if not has_users:
            command.stamp(alembic_cfg, "20260415_0001")
            command.upgrade(alembic_cfg, "20260508_0002")
        _patch_legacy_schema()
        command.stamp(alembic_cfg, "head")
        return

    if has_devices and (has_missing_device_columns or has_missing_user_columns or current_revision in LEGACY_PATCH_REVISIONS):
        _patch_legacy_schema()
        command.stamp(alembic_cfg, "head")
        return

    command.upgrade(alembic_cfg, "head")
