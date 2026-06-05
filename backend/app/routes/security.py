from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.security_event import AttackType, SecurityEvent
from app.models.user import User
from app.schemas.security import (
    SecurityEventOut,
    SecurityStatsOut,
    SimulateAttackRequest,
    SimulateAttackResponse,
)
from app.services import attack_sim_service, telegram_service
from app.services.attack_sim_service import SimulationError

router = APIRouter(prefix="/security", tags=["security"])


@router.post("/simulate", response_model=SimulateAttackResponse)
def simulate_attack(
    payload: SimulateAttackRequest,
    request: Request,
    current_user: User = Depends(require_admin),
) -> SimulateAttackResponse:
    try:
        result = attack_sim_service.run_simulation(
            attack_type=payload.attack_type,
            intensity=payload.intensity,
            target_hardware_id=payload.target_hardware_id,
            target_secret=payload.target_secret,
            target_email=payload.target_email,
            user_id=current_user.id,
            source_ip=request.client.host if request.client else None,
        )
    except SimulationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    return SimulateAttackResponse(
        sim_id=result["sim_id"],
        attack_type=payload.attack_type,
        summary=result,
    )


@router.get("/events", response_model=list[SecurityEventOut])
def list_security_events(
    limit: int = Query(default=50, ge=1, le=500),
    attack_type: AttackType | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[SecurityEventOut]:
    query = select(SecurityEvent).order_by(SecurityEvent.created_at.desc())
    if attack_type is not None:
        query = query.where(SecurityEvent.attack_type == attack_type)
    events = db.scalars(query.limit(limit)).all()
    return [SecurityEventOut.model_validate(event) for event in events]


@router.get("/stats", response_model=SecurityStatsOut)
def security_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> SecurityStatsOut:
    total = db.scalar(select(func.count()).select_from(SecurityEvent)) or 0
    blocked = (
        db.scalar(select(func.count()).select_from(SecurityEvent).where(SecurityEvent.blocked.is_(True))) or 0
    )
    by_type_rows = db.execute(
        select(SecurityEvent.attack_type, func.count()).group_by(SecurityEvent.attack_type)
    ).all()
    by_type = {attack.value: count for attack, count in by_type_rows}

    return SecurityStatsOut(
        total=total,
        blocked=blocked,
        not_blocked=total - blocked,
        by_type=by_type,
        telegram_configured=telegram_service.is_configured(),
    )
