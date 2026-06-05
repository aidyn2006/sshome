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


def test_password_reset_code_migration_exists() -> None:
    migration_path = Path("alembic/versions/20260513_0007_create_password_reset_codes.py")

    assert migration_path.exists()
    migration = migration_path.read_text(encoding="utf-8")
    assert "create password reset codes" in migration
    assert "password_reset_codes" in migration
    assert "code_hash" in migration


def test_user_favorite_device_ids_migration_exists() -> None:
    migration_path = Path("alembic/versions/20260605_0008_add_user_favorite_device_ids.py")

    assert migration_path.exists()
    migration = migration_path.read_text(encoding="utf-8")
    assert "add user favorite device ids" in migration
    assert "favorite_device_ids" in migration
