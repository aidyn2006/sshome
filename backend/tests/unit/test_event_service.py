from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services import event_service


def test_list_events_validates_home_scope_before_query(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    home_id = uuid4()
    expected_events = [SimpleNamespace(id=uuid4())]
    db.scalars.return_value = expected_events

    calls: list[tuple] = []

    def fake_get_home_or_404(db_arg, *, home_id, owner_id):
        assert db_arg is db
        calls.append((home_id, owner_id))
        return SimpleNamespace(id=home_id)

    monkeypatch.setattr("app.services.event_service.get_home_or_404", fake_get_home_or_404)

    result = event_service.list_events(db, owner_id=owner_id, home_id=home_id)

    assert result == expected_events
    assert calls == [(home_id, owner_id)]
    db.scalars.assert_called_once()


def test_list_events_validates_device_scope_before_query(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    device_id = uuid4()
    expected_events = [SimpleNamespace(id=uuid4())]
    db.scalars.return_value = expected_events

    calls: list[tuple] = []

    def fake_get_owned_device(db_arg, *, device_id, owner_id):
        assert db_arg is db
        calls.append((device_id, owner_id))
        return SimpleNamespace(id=device_id)

    monkeypatch.setattr("app.services.event_service._get_owned_device", fake_get_owned_device)

    result = event_service.list_events(db, owner_id=owner_id, device_id=device_id)

    assert result == expected_events
    assert calls == [(device_id, owner_id)]
    db.scalars.assert_called_once()


def test_list_events_rejects_invalid_date_range() -> None:
    db = MagicMock()
    owner_id = uuid4()
    date_from = datetime(2026, 4, 16, 12, 0, tzinfo=UTC)
    date_to = datetime(2026, 4, 15, 12, 0, tzinfo=UTC)

    with pytest.raises(HTTPException) as exc_info:
        event_service.list_events(
            db,
            owner_id=owner_id,
            date_from=date_from,
            date_to=date_to,
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "date_from must be less than or equal to date_to"
    db.scalars.assert_not_called()


def test_list_events_returns_ordered_scalars_for_valid_filters() -> None:
    db = MagicMock()
    owner_id = uuid4()
    device_id = uuid4()
    home_id = uuid4()
    date_from = datetime(2026, 4, 15, 10, 0, tzinfo=UTC)
    date_to = date_from + timedelta(hours=2)
    expected_events = [SimpleNamespace(id=uuid4()), SimpleNamespace(id=uuid4())]
    db.scalars.return_value = expected_events

    result = event_service.list_events(
        db,
        owner_id=owner_id,
        device_id=device_id,
        home_id=home_id,
        date_from=date_from,
        date_to=date_to,
    )

    assert result == expected_events
    db.scalars.assert_called_once()
