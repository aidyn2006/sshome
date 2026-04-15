from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from app.services import home_service, room_service
from app.schemas.home import HomeCreate
from app.schemas.room import RoomCreate


def test_create_home_persists_home_with_authenticated_owner() -> None:
    db = MagicMock()
    owner_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    home = home_service.create_home(
        db,
        owner_id=owner_id,
        payload=HomeCreate(name="My Home"),
    )

    db.add.assert_called_once_with(home)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(home)
    assert home.name == "My Home"
    assert home.owner_id == owner_id


def test_get_home_or_404_returns_404_for_missing_home() -> None:
    db = MagicMock()
    db.scalar.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        home_service.get_home_or_404(
            db,
            home_id=uuid4(),
            owner_id=uuid4(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Home not found"


def test_create_room_persists_room_in_owned_home(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    home_id = uuid4()
    owned_home = SimpleNamespace(id=home_id)

    monkeypatch.setattr("app.services.room_service._get_owned_home", lambda *args, **kwargs: owned_home)

    room = room_service.create_room(
        db,
        owner_id=owner_id,
        payload=RoomCreate(name="Kitchen", home_id=home_id),
    )

    db.add.assert_called_once_with(room)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(room)
    assert room.name == "Kitchen"
    assert room.home_id == home_id


def test_list_rooms_validates_home_scope_before_query(monkeypatch) -> None:
    db = MagicMock()
    owner_id = uuid4()
    home_id = uuid4()
    expected_rooms = [SimpleNamespace(id=uuid4(), name="Bedroom", home_id=home_id)]
    db.scalars.return_value = expected_rooms

    calls: list[tuple[UUID, UUID]] = []

    def fake_get_owned_home(db_arg, *, home_id, owner_id):
        assert db_arg is db
        calls.append((home_id, owner_id))
        return SimpleNamespace(id=home_id)

    monkeypatch.setattr("app.services.room_service._get_owned_home", fake_get_owned_home)

    result = room_service.list_rooms(db, owner_id=owner_id, home_id=home_id)

    assert result == expected_rooms
    assert calls == [(home_id, owner_id)]
    db.scalars.assert_called_once()


def test_get_room_or_404_returns_404_for_missing_room() -> None:
    db = MagicMock()
    db.scalar.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        room_service.get_room_or_404(
            db,
            room_id=uuid4(),
            owner_id=uuid4(),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Room not found"
