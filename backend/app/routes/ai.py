from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentOwnerId
from app.db.session import get_db
from app.schemas.ai import AutomationSuggestionList, HomeStateRead
from app.services import ai_service

router = APIRouter(tags=["ai"])


@router.get("/state", response_model=HomeStateRead)
def get_state(
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> HomeStateRead:
    return ai_service.get_home_state(db, owner_id=owner_id)


@router.get("/ai/suggestions", response_model=AutomationSuggestionList)
def get_ai_suggestions(
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> AutomationSuggestionList:
    return ai_service.get_automation_suggestions(db, owner_id=owner_id)
