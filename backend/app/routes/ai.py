from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentAuth, CurrentOwnerId
from app.core.rate_limit import enforce_device_action_rate_limit
from app.db.session import get_db
from app.schemas.ai import (
    AIAssistantActionExecutionRequest,
    AIAssistantActionExecutionResult,
    AIAssistantChatRequest,
    AIAssistantChatResponse,
    AISecurityAnalysisRequest,
    AISecurityAnalysisResponse,
    AIScenarioDraft,
    AIScenarioDraftRequest,
    AutomationSuggestionList,
    HomeStateRead,
)
from app.services import ai_service
from app.services.mqtt_service import publish_device_command
from app.websockets.publisher import publish_device_update_from_sync

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


@router.post("/ai/scenario-draft", response_model=AIScenarioDraft)
def generate_scenario_draft(
    payload: AIScenarioDraftRequest,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> AIScenarioDraft:
    return ai_service.generate_scenario_draft(db, owner_id=owner_id, prompt=payload.prompt)


@router.post("/ai/chat", response_model=AIAssistantChatResponse)
def assistant_chat(
    payload: AIAssistantChatRequest,
    owner_id: CurrentOwnerId,
    db: Session = Depends(get_db),
) -> AIAssistantChatResponse:
    return ai_service.assistant_chat(db, owner_id=owner_id, message=payload.message)


@router.post("/ai/security-analysis", response_model=AISecurityAnalysisResponse)
def analyze_security_activity(
    payload: AISecurityAnalysisRequest,
    auth_context: CurrentAuth,
    db: Session = Depends(get_db),
) -> AISecurityAnalysisResponse:
    roles = {role.upper() for role in auth_context.roles}
    return ai_service.analyze_security_activity(
        db,
        owner_id=auth_context.owner_id,
        window=payload.window,
        include_security_events="ADMIN" in roles,
    )


@router.post("/ai/confirm-device-actions", response_model=AIAssistantActionExecutionResult)
def confirm_assistant_device_actions(
    payload: AIAssistantActionExecutionRequest,
    owner_id: CurrentOwnerId,
    request: Request,
    db: Session = Depends(get_db),
) -> AIAssistantActionExecutionResult:
    enforce_device_action_rate_limit(request, str(owner_id))
    result = ai_service.execute_assistant_device_actions(
        db,
        owner_id=owner_id,
        actions=payload.actions,
    )
    for item in result.executed_actions:
        publish_device_update_from_sync(
            owner_id=owner_id,
            device=item.device,
            source="device_action",
            action=item.action,
        )
        publish_device_command(device=item.device, action=item.action)
    return result
