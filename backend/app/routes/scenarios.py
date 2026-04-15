from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentOwnerId
from app.core.rate_limit import enforce_scenario_run_rate_limit
from app.db.session import get_db
from app.schemas.device import DeviceRead
from app.schemas.scenario import ScenarioCreate, ScenarioRead, ScenarioRunResult
from app.services import scenario_service
from app.websockets.publisher import publish_device_update_from_sync

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.post("", response_model=ScenarioRead, status_code=status.HTTP_201_CREATED)
def create_scenario(
    payload: ScenarioCreate,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> ScenarioRead:
    return scenario_service.create_scenario(db, owner_id=owner_id, payload=payload)


@router.get("", response_model=list[ScenarioRead])
def list_scenarios(
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> list[ScenarioRead]:
    return scenario_service.list_scenarios(db, owner_id=owner_id)


@router.post("/{scenario_id}/run", response_model=ScenarioRunResult)
def run_scenario(
    scenario_id: UUID,
    owner_id: CurrentOwnerId,
    request: Request,
    db: Session = Depends(get_db),
) -> ScenarioRunResult:
    enforce_scenario_run_rate_limit(request, str(owner_id))
    result = ScenarioRunResult.model_validate(
        scenario_service.run_scenario(db, scenario_id=scenario_id, owner_id=owner_id)
    )
    for device in result.devices:
        publish_device_update_from_sync(
            owner_id=owner_id,
            device=DeviceRead.model_validate(device),
            source="scenario_run",
            scenario_id=scenario_id,
        )
    return result
