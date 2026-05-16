from __future__ import annotations

import hashlib
import json
import random
import secrets
import string
from datetime import date
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.audit_log import AuditLogAction
from app.models.enums import DeviceType
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminUserOut,
    GenerateManufacturedDevicesRequest,
    GenerateManufacturedDevicesResponse,
    ManufacturedDeviceOut,
    UpdateUserRoleRequest,
)
from app.services.audit_service import log_action

router = APIRouter(prefix="/admin", tags=["admin"])


def _registry_file() -> Path:
    return Path("manufactured_devices.json")


def _secrets_file() -> Path:
    return Path("manufactured_secrets.txt")


def _load_registry() -> list[dict]:
    path = _registry_file()
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _save_registry(devices: list[dict]) -> None:
    _registry_file().write_text(json.dumps(devices, indent=2), encoding="utf-8")


def _random_suffix(length: int = 6) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=length))


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def _generate_manufactured_devices(count: int, device_type: DeviceType) -> list[ManufacturedDeviceOut]:
    registry = _load_registry()
    existing_ids = {device["hardware_id"] for device in registry}
    batch = date.today().strftime("%Y%m%d")
    generated: list[ManufacturedDeviceOut] = []
    secret_lines: list[str] = []

    for _ in range(count):
        hardware_id = f"sshome_{batch}_{_random_suffix()}"
        while hardware_id in existing_ids:
            hardware_id = f"sshome_{batch}_{_random_suffix()}"
        existing_ids.add(hardware_id)

        plain_secret = secrets.token_hex(32)
        secret_hash = _hash_secret(plain_secret)
        registry_entry = {
            "hardware_id": hardware_id,
            "device_type": device_type.value,
            "secret_hash": secret_hash,
            "batch": batch,
            "claimed": False,
        }
        registry.append(registry_entry)
        secret_lines.append(f"{hardware_id}\t{plain_secret}")
        generated.append(ManufacturedDeviceOut(secret=plain_secret, **registry_entry))

    _save_registry(registry)
    with _secrets_file().open("a", encoding="utf-8") as secrets_output:
        secrets_output.write("\n".join(secret_lines) + "\n")

    return generated


@router.post("/devices/generate", response_model=GenerateManufacturedDevicesResponse)
def generate_manufactured_devices(
    payload: GenerateManufacturedDevicesRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> GenerateManufacturedDevicesResponse:
    devices = _generate_manufactured_devices(payload.count, payload.device_type)
    log_action(
        db,
        action=AuditLogAction.ADMIN_DEVICE_GENERATED,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
    )
    return GenerateManufacturedDevicesResponse(devices=devices)


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminUserOut]:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [AdminUserOut.model_validate(user) for user in users]


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
def update_user_role(
    user_id: UUID,
    payload: UpdateUserRoleRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> AdminUserOut:
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if target_user.id == current_user.id and payload.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove your own admin role")

    if target_user.role == UserRole.ADMIN and payload.role != UserRole.ADMIN:
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active.is_(True)).count()
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one admin is required")

    target_user.role = payload.role
    db.add(target_user)
    db.commit()
    db.refresh(target_user)

    log_action(
        db,
        action=AuditLogAction.ADMIN_USER_ROLE_CHANGED,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
    )
    return AdminUserOut.model_validate(target_user)
