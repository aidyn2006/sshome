from pathlib import Path


def test_initial_iot_migration_exists() -> None:
    migration_path = Path("alembic/versions/20260415_0001_create_iot_schema.py")

    assert migration_path.exists()
    assert "create iot schema" in migration_path.read_text(encoding="utf-8")


def test_auth_migration_exists() -> None:
    migration_path = Path("alembic/versions/20260508_0002_create_auth_schema.py")

    assert migration_path.exists()
    migration = migration_path.read_text(encoding="utf-8")
    assert "create auth schema" in migration
    assert "users" in migration
    assert "refresh_tokens" in migration
    assert "audit_logs" in migration


def test_device_hardware_id_migration_exists() -> None:
    migration_path = Path("alembic/versions/20260513_0003_add_device_hardware_id.py")

    assert migration_path.exists()
    migration = migration_path.read_text(encoding="utf-8")
    assert "add device hardware id" in migration
    assert "hardware_id" in migration
