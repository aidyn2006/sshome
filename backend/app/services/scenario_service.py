from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.scenario import Scenario
from app.schemas.scenario import ScenarioActionItem, ScenarioCreate, ScenarioRunResult
from app.services import device_service


def _serialize_action(action: ScenarioActionItem) -> dict[str, str]:
    return {
        "device_id": str(action.device_id),
        "action": action.action.value,
    }


def _deserialize_action(raw_action: dict) -> ScenarioActionItem:
    return ScenarioActionItem.model_validate(raw_action)


def get_scenario_or_404(db: Session, *, scenario_id: UUID, owner_id: UUID) -> Scenario:
    statement = select(Scenario).where(Scenario.id == scenario_id, Scenario.owner_id == owner_id)
    scenario = db.scalar(statement)
    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    return scenario


def _validate_scenario_actions(db: Session, *, owner_id: UUID, actions: list[ScenarioActionItem]) -> None:
    for action_item in actions:
        device = device_service.get_device_or_404(
            db,
            device_id=action_item.device_id,
            owner_id=owner_id,
        )
        device_service._target_status_for_action(
            device_type=device.type,
            action=action_item.action,
        )


def create_scenario(db: Session, *, owner_id: UUID, payload: ScenarioCreate) -> Scenario:
    _validate_scenario_actions(db, owner_id=owner_id, actions=payload.actions)

    scenario = Scenario(
        name=payload.name,
        description=payload.description,
        actions=[_serialize_action(action) for action in payload.actions],
        owner_id=owner_id,
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def list_scenarios(db: Session, *, owner_id: UUID) -> list[Scenario]:
    statement = select(Scenario).where(Scenario.owner_id == owner_id).order_by(Scenario.created_at.desc(), Scenario.id.desc())
    return list(db.scalars(statement))


def run_scenario(db: Session, *, scenario_id: UUID, owner_id: UUID) -> ScenarioRunResult:
    scenario = get_scenario_or_404(db, scenario_id=scenario_id, owner_id=owner_id)
    action_items = [_deserialize_action(raw_action) for raw_action in scenario.actions]
    _validate_scenario_actions(db, owner_id=owner_id, actions=action_items)

    devices = []
    for action_item in action_items:
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
        devices.append(updated_device)

    db.commit()
    for device in devices:
        db.refresh(device)

    return ScenarioRunResult(
        scenario_id=scenario.id,
        executed_actions=len(action_items),
        devices=devices,
    )
