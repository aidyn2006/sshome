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
    AIAssistantActionExecutionResult,
    AIAssistantChatResponse,
    AIAssistantControlProposal,
    AIAssistantDeviceAction,
    AIAssistantExecutedAction,
    AIAssistantScenarioRunProposal,
    AIScenarioDraft,
    AIScenarioDraftAction,
    AutomationSuggestion,
    AutomationSuggestionList,
    HomeStateRead,
    HomeStateSummary,
)
from app.schemas.device import DeviceRead
from app.services import device_service, event_service, home_service, room_service, scenario_service

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

_ASSISTANT_SYSTEM_PROMPT = (
    "You are the SSHome smart-home assistant. Answer in the same language as the user when possible. "
    "Use only the provided context: homes, rooms, devices, recent events, and saved scenarios. "
    "You can explain the current state, summarize recent activity, and prepare scenario drafts. "
    "You cannot execute device actions, run scenarios, change passwords, reveal secrets, or access server files. "
    "If the user asks to control devices, include a control proposal and tell them to confirm it. "
    "If the user asks to run an existing scenario, include a scenario_run proposal and tell them to confirm it. "
    "If the user asks to create a scene/scenario/routine, include a scenario draft. "
    "Never claim an action has been executed until a separate confirmation endpoint executes it."
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


def _assistant_chat_schema(device_ids: list[str], scenario_ids: list[str]) -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "answer": {"type": "string"},
            "scenario_draft": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "present": {"type": "boolean"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "actions": {
                        "type": "array",
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
                "required": ["present", "name", "description", "actions", "explanation"],
            },
            "control_proposal": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "present": {"type": "boolean"},
                    "actions": {
                        "type": "array",
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
                "required": ["present", "actions", "explanation"],
            },
            "scenario_run": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "present": {"type": "boolean"},
                    "scenario_id": {"type": "string", "enum": scenario_ids},
                    "explanation": {"type": "string"},
                },
                "required": ["present", "scenario_id", "explanation"],
            },
        },
        "required": ["answer", "scenario_draft", "control_proposal", "scenario_run"],
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


def _post_openai_structured(*, system_prompt: str, user_payload: dict, schema_name: str, schema: dict) -> dict:
    api_key = (settings.openai_api_key or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured on the backend",
        )

    payload = {
        "model": settings.openai_model,
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "strict": True,
                "schema": schema,
            }
        },
        "max_output_tokens": 1200,
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
            detail="OpenAI assistant request failed",
        ) from exc

    try:
        return json.loads(_extract_response_text(response.json()))
    except (json.JSONDecodeError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned invalid assistant JSON",
        ) from exc


def _device_context(db: Session, *, owner_id: UUID) -> tuple[list, list[dict]]:
    rooms = room_service.list_rooms(db, owner_id=owner_id)
    room_name_by_id = {room.id: room.name for room in rooms}
    devices = device_service.list_devices(db, owner_id=owner_id)
    device_reads: dict[UUID, DeviceRead] = {}
    for device in devices:
        try:
            device_reads[device.id] = DeviceRead.model_validate(device)
        except ValidationError:
            continue

    context = [
        {
            "device_id": str(device.id),
            "name": device.name,
            "type": device.type.value,
            "status": device.status.value,
            "room": room_name_by_id.get(device.room_id, "Unknown room"),
            "is_controllable": device.type in _SUPPORTED_ACTIONS_BY_TYPE,
            "supported_actions": [
                action.value for action in _SUPPORTED_ACTIONS_BY_TYPE.get(device.type, [])
            ],
            "is_online": device_reads[device.id].is_online if device.id in device_reads else None,
            "battery_level": getattr(device, "battery_level", None),
            "last_error": getattr(device, "last_error", None),
            "last_seen_at": getattr(device, "last_seen_at", None).isoformat()
            if getattr(device, "last_seen_at", None)
            else None,
            "telemetry": getattr(device, "telemetry", None),
        }
        for device in devices
    ]
    return devices, context


def _validate_scenario_draft_actions(devices: list, draft: AIScenarioDraft) -> AIScenarioDraft:
    devices_by_id = {device.id: device for device in devices}
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


def _validate_device_actions(devices: list, actions: list[AIAssistantDeviceAction]) -> list[AIAssistantDeviceAction]:
    devices_by_id = {device.id: device for device in devices}
    validated_actions: list[AIAssistantDeviceAction] = []

    for action_item in actions:
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

    return validated_actions


def _control_proposal_from_raw(devices: list, raw_control: object) -> AIAssistantControlProposal | None:
    if not isinstance(raw_control, dict) or raw_control.get("present") is not True:
        return None

    try:
        actions = [
            AIAssistantDeviceAction.model_validate(action)
            for action in raw_control.get("actions", [])
        ]
        proposal = AIAssistantControlProposal(
            actions=_validate_device_actions(devices, actions),
            explanation=str(raw_control.get("explanation") or "").strip(),
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned a control proposal that failed validation",
        ) from exc

    return proposal


def _assistant_context(db: Session, *, owner_id: UUID, now: datetime | None = None) -> tuple[list, dict]:
    generated_at = now or datetime.now(UTC)
    homes = home_service.list_homes(db, owner_id=owner_id)
    rooms = room_service.list_rooms(db, owner_id=owner_id)
    devices, device_context = _device_context(db, owner_id=owner_id)
    device_name_by_id = {device.id: device.name for device in devices}
    scenarios = scenario_service.list_scenarios(db, owner_id=owner_id)
    events = event_service.list_events(
        db,
        owner_id=owner_id,
        date_from=generated_at - timedelta(days=7),
        date_to=generated_at,
    )[:50]

    return devices, {
        "generated_at": generated_at.isoformat(),
        "homes": [
            {
                "home_id": str(home.id),
                "name": home.name,
                "created_at": home.created_at.isoformat(),
            }
            for home in homes
        ],
        "rooms": [
            {
                "room_id": str(room.id),
                "name": room.name,
                "home_id": str(room.home_id),
            }
            for room in rooms
        ],
        "devices": device_context,
        "recent_events": [
            {
                "event_id": str(event.id),
                "device_id": str(event.device_id),
                "device_name": device_name_by_id.get(event.device_id, "Unknown device"),
                "action": event.action.value,
                "timestamp": event.timestamp.isoformat(),
            }
            for event in events
        ],
        "scenarios": [
            {
                "scenario_id": str(scenario.id),
                "name": scenario.name,
                "description": scenario.description,
                "actions": [
                    {
                        "device_id": str(raw_action.get("device_id")),
                        "device_name": device_name_by_id.get(UUID(str(raw_action.get("device_id"))), "Unknown device")
                        if raw_action.get("device_id")
                        else "Unknown device",
                        "action": raw_action.get("action"),
                    }
                    for raw_action in scenario.actions
                ],
            }
            for scenario in scenarios
        ],
    }


def generate_scenario_draft(db: Session, *, owner_id: UUID, prompt: str) -> AIScenarioDraft:
    devices, all_device_context = _device_context(db, owner_id=owner_id)
    controllable_devices = [
        device for device in devices if device.type in _SUPPORTED_ACTIONS_BY_TYPE
    ]

    if not controllable_devices:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No controllable devices are available for AI scenario generation",
        )

    controllable_ids = {str(device.id) for device in controllable_devices}
    device_context = [
        device for device in all_device_context if device["device_id"] in controllable_ids
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

    return _validate_scenario_draft_actions(controllable_devices, draft)


def assistant_chat(db: Session, *, owner_id: UUID, message: str) -> AIAssistantChatResponse:
    devices, context = _assistant_context(db, owner_id=owner_id)
    controllable_devices = [
        device for device in devices if device.type in _SUPPORTED_ACTIONS_BY_TYPE
    ]
    device_ids = [str(device.id) for device in controllable_devices] or [
        "00000000-0000-0000-0000-000000000000"
    ]
    scenarios = scenario_service.list_scenarios(db, owner_id=owner_id)
    scenario_ids = [str(scenario.id) for scenario in scenarios] or [
        "00000000-0000-0000-0000-000000000000"
    ]
    scenario_by_id = {scenario.id: scenario for scenario in scenarios}

    raw = _post_openai_structured(
        system_prompt=_ASSISTANT_SYSTEM_PROMPT,
        user_payload={
            "user_message": message.strip(),
            "home_context": context,
            "assistant_stage": "read_explain_and_prepare_scenario_drafts_only",
        },
        schema_name="sshome_assistant_chat",
        schema=_assistant_chat_schema(device_ids, scenario_ids),
    )

    answer = str(raw.get("answer") or "").strip()
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned an empty assistant answer",
        )

    scenario_draft = None
    raw_draft = raw.get("scenario_draft")
    if isinstance(raw_draft, dict) and raw_draft.get("present") is True:
        try:
            draft = AIScenarioDraft.model_validate(
                {
                    "name": raw_draft.get("name"),
                    "description": raw_draft.get("description"),
                    "actions": raw_draft.get("actions"),
                    "explanation": raw_draft.get("explanation"),
                }
            )
        except ValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned an assistant scenario draft that failed validation",
            ) from exc
        scenario_draft = _validate_scenario_draft_actions(controllable_devices, draft)

    control_proposal = _control_proposal_from_raw(
        controllable_devices,
        raw.get("control_proposal"),
    )

    scenario_run = None
    raw_scenario_run = raw.get("scenario_run")
    if isinstance(raw_scenario_run, dict) and raw_scenario_run.get("present") is True:
        try:
            scenario_id = UUID(str(raw_scenario_run.get("scenario_id")))
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI returned an invalid scenario id",
            ) from exc
        scenario = scenario_by_id.get(scenario_id)
        if scenario is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="AI selected a scenario that is not available",
            )
        scenario_run = AIAssistantScenarioRunProposal(
            scenario_id=scenario.id,
            name=scenario.name,
            explanation=str(raw_scenario_run.get("explanation") or "").strip(),
        )

    return AIAssistantChatResponse(
        answer=answer,
        scenario_draft=scenario_draft,
        control_proposal=control_proposal,
        scenario_run=scenario_run,
    )


def execute_assistant_device_actions(
    db: Session,
    *,
    owner_id: UUID,
    actions: list[AIAssistantDeviceAction],
) -> AIAssistantActionExecutionResult:
    devices = []
    executed_actions: list[AIAssistantExecutedAction] = []

    validated_actions = _validate_device_actions(
        [device_service.get_device_or_404(db, device_id=action.device_id, owner_id=owner_id) for action in actions],
        actions,
    )

    for action_item in validated_actions:
        device = device_service.get_device_or_404(
            db,
            device_id=action_item.device_id,
            owner_id=owner_id,
        )
        updated_device = device_service._apply_device_action_to_device(
            db,
            device=device,
            owner_id=owner_id,
            action=action_item.action,
        )
        devices.append((updated_device, action_item.action))

    db.commit()

    for device, action in devices:
        db.refresh(device)
        executed_actions.append(
            AIAssistantExecutedAction(
                device=DeviceRead.model_validate(device),
                action=action,
            )
        )

    return AIAssistantActionExecutionResult(
        message=f"Executed {len(executed_actions)} action{'s' if len(executed_actions) != 1 else ''}.",
        executed_actions=executed_actions,
    )
