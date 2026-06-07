from collections import defaultdict
from datetime import UTC, datetime, timedelta
import json
from uuid import UUID

from fastapi import HTTPException, status
import httpx
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.enums import DeviceAction, DeviceStatus, DeviceType
from app.schemas.ai import (
    AIScenarioDraft,
    AIScenarioDraftAction,
    AutomationSuggestion,
    AutomationSuggestionList,
    HomeStateRead,
    HomeStateSummary,
)
from app.schemas.device import DeviceRead
from app.services import device_service, event_service, room_service

MIN_REPEATED_ACTIONS = 3
LOOKBACK_DAYS = 30
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

_SUPPORTED_ACTIONS_BY_TYPE: dict[DeviceType, list[DeviceAction]] = {
    DeviceType.LIGHT: [DeviceAction.TURN_ON, DeviceAction.TURN_OFF],
    DeviceType.AC: [DeviceAction.TURN_ON, DeviceAction.TURN_OFF],
    DeviceType.DOOR: [DeviceAction.OPEN, DeviceAction.CLOSE],
}

_SYSTEM_PROMPT = (
    "You generate smart-home scenario drafts. Return only JSON that matches the schema. "
    "Use only device_id values from the available devices. Use only supported_actions listed for each device. "
    "Do not invent rooms, devices, ids, schedules, or hidden actions. Prefer short English scene names. "
    "A scenario must be safe for the user to review before saving; never claim that actions were executed."
)


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


def _scenario_draft_schema(device_ids: list[str]) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "name": {"type": "string"},
            "description": {"type": "string"},
            "actions": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "device_id": {"type": "string", "enum": device_ids},
                        "action": {
                            "type": "string",
                            "enum": [action.value for action in DeviceAction],
                        },
                    },
                    "required": ["device_id", "action"],
                },
            },
            "explanation": {"type": "string"},
        },
        "required": ["name", "description", "actions", "explanation"],
    }


def _extract_response_text(response_json: dict) -> str:
    output_text = response_json.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    for output_item in response_json.get("output", []):
        if not isinstance(output_item, dict):
            continue
        for content_item in output_item.get("content", []):
            if not isinstance(content_item, dict):
                continue
            text = content_item.get("text")
            if isinstance(text, str) and text.strip():
                return text

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="OpenAI returned an empty scenario draft",
    )


def _openai_scenario_draft(*, prompt: str, devices: list[dict]) -> dict:
    api_key = (settings.openai_api_key or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured on the backend",
        )

    device_ids = [device["device_id"] for device in devices]
    payload = {
        "model": settings.openai_model,
        "input": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "user_request": prompt,
                        "available_devices": devices,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "smart_home_scenario_draft",
                "strict": True,
                "schema": _scenario_draft_schema(device_ids),
            }
        },
        "max_output_tokens": 800,
    }

    try:
        with httpx.Client(timeout=settings.openai_timeout_seconds) as client:
            response = client.post(
                OPENAI_RESPONSES_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI scenario draft request failed",
        ) from exc

    try:
        return json.loads(_extract_response_text(response.json()))
    except (json.JSONDecodeError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned invalid scenario JSON",
        ) from exc


def generate_scenario_draft(db: Session, *, owner_id: UUID, prompt: str) -> AIScenarioDraft:
    rooms = room_service.list_rooms(db, owner_id=owner_id)
    room_name_by_id = {room.id: room.name for room in rooms}
    devices = device_service.list_devices(db, owner_id=owner_id)
    controllable_devices = [
        device for device in devices if device.type in _SUPPORTED_ACTIONS_BY_TYPE
    ]

    if not controllable_devices:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No controllable devices are available for AI scenario generation",
        )

    device_context = [
        {
            "device_id": str(device.id),
            "name": device.name,
            "type": device.type.value,
            "status": device.status.value,
            "room": room_name_by_id.get(device.room_id, "Unknown room"),
            "supported_actions": [
                action.value for action in _SUPPORTED_ACTIONS_BY_TYPE[device.type]
            ],
        }
        for device in controllable_devices
    ]

    try:
        draft = AIScenarioDraft.model_validate(
            _openai_scenario_draft(prompt=prompt.strip(), devices=device_context)
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned a scenario draft that failed validation",
        ) from exc

    devices_by_id = {device.id: device for device in controllable_devices}
    validated_actions: list[AIScenarioDraftAction] = []
    for action_item in draft.actions:
        device = devices_by_id.get(action_item.device_id)
        if device is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="AI selected a device that is not available",
            )
        device_service._target_status_for_action(
            device_type=device.type,
            action=action_item.action,
        )
        validated_actions.append(action_item)

    description = draft.description.strip() if draft.description else None
    return AIScenarioDraft(
        name=draft.name.strip(),
        description=description or None,
        actions=validated_actions,
        explanation=draft.explanation.strip(),
    )
