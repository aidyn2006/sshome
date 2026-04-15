from app.db.base import Base
from app.models import Device


def test_metadata_contains_expected_iot_tables() -> None:
    assert {"homes", "rooms", "devices", "events", "scenarios"}.issubset(Base.metadata.tables.keys())


def test_device_model_uses_expected_enums_and_indexes() -> None:
    device_table = Device.__table__

    assert device_table.c.type.type.name == "device_type"
    assert device_table.c.status.type.name == "device_status"
    assert device_table.c.room_id.index is True
    assert device_table.c.owner_id.index is True


def test_events_table_uses_device_action_enum() -> None:
    events_table = Base.metadata.tables["events"]

    assert events_table.c.action.type.name == "device_action"
