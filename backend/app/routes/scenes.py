from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentOwnerId
from app.core.rate_limit import enforce_scenario_run_rate_limit
from app.db.session import get_db
from app.schemas.device import DeviceRead
from app.schemas.scene import SceneRunRequest, SceneRunResult
from app.services import scene_service
from app.websockets.publisher import publish_device_update_from_sync

router = APIRouter(prefix="/scenes", tags=["scenes"])


@router.post("/run", response_model=SceneRunResult)
def run_scene(
    payload: SceneRunRequest,
    owner_id: CurrentOwnerId,
    request: Request,
    db: Session = Depends(get_db),
) -> SceneRunResult:
    enforce_scenario_run_rate_limit(request, str(owner_id))
    result = scene_service.run_scene(db, owner_id=owner_id, payload=payload)
    for device in result.devices:
        publish_device_update_from_sync(
            owner_id=owner_id,
            device=DeviceRead.model_validate(device),
            source="scenario_run",
        )
    return result
