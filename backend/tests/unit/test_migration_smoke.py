from pathlib import Path


def test_initial_iot_migration_exists() -> None:
    migration_path = Path("alembic/versions/20260415_0001_create_iot_schema.py")

    assert migration_path.exists()
    assert "create iot schema" in migration_path.read_text(encoding="utf-8")
