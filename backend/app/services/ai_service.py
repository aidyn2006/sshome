from collections import defaultdict
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.enums import DeviceAction, DeviceStatus
from app.schemas.ai import AutomationSuggestion, AutomationSuggestionList, HomeStateRead, HomeStateSummary
from app.schemas.device import DeviceRead
from app.services import device_service, event_service

MIN_REPEATED_ACTIONS = 3
LOOKBACK_DAYS = 30


def get_home_state(db: Session, *, owner_id: UUID) -> HomeStateRead:
    devices = [DeviceRead.model_validate(device) for device in device_service.list_devices(db, owner_id=owner_id)]
    active_devices = sum(1 for device in devices if device.status in {DeviceStatus.ON, DeviceStatus.OPEN})
    open_doors = sum(1 for device in devices if device.status == DeviceStatus.OPEN)

    return HomeStateRead(
        generated_at=datetime.now(UTC),
        summary=HomeStateSummary(
            total_devices=len(devices),
            active_devices=active_devices,
            open_doors=open_doors,
        ),
        devices=devices,
    )


def get_automation_suggestions(db: Session, *, owner_id: UUID, now: datetime | None = None) -> AutomationSuggestionList:
    generated_at = now or datetime.now(UTC)
    events = event_service.list_events(
        db,
        owner_id=owner_id,
        date_from=generated_at - timedelta(days=LOOKBACK_DAYS),
        date_to=generated_at,
    )

    grouped_events: dict[tuple[UUID, DeviceAction, int], list] = defaultdict(list)
    for event in events:
        grouped_events[(event.device_id, event.action, event.timestamp.hour)].append(event)

    suggestions: list[AutomationSuggestion] = []
    for (device_id, action, hour), action_events in grouped_events.items():
        if len(action_events) < MIN_REPEATED_ACTIONS:
            continue

        device_name = getattr(action_events[0].device, "name", "device")
        suggested_time = f"{hour:02d}:00"
        suggestions.append(
            AutomationSuggestion(
                id=f"{device_id}:{action.value}:{hour}",
                title="Автоматизация по привычке",
                message=(
                    f"Ты часто выполняешь {action.value} для {device_name} около {suggested_time}. "
                    "Можно включить авто-сценарий для этого времени."
                ),
                device_id=device_id,
                device_name=device_name,
                action=action.value,
                suggested_time=suggested_time,
                confidence=min(0.95, 0.55 + len(action_events) * 0.1),
                evidence_count=len(action_events),
            )
        )

    suggestions.sort(key=lambda suggestion: (-suggestion.confidence, suggestion.suggested_time, suggestion.device_name))
    return AutomationSuggestionList(generated_at=generated_at, suggestions=suggestions)
