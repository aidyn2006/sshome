from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


def validate_password_strength(password: str) -> str:
    """Same policy the mobile app enforces: 8+ chars, an uppercase letter and a digit."""
    if not any(char.isupper() for char in password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not any(char.isdigit() for char in password):
        raise ValueError("Password must contain at least one digit")
    return password


class RegisterRequest(BaseModel):
    # role intentionally not accepted here: new accounts are always USER,
    # admins are promoted via the admin endpoint.
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)

    _password_strength = field_validator("password")(validate_password_strength)


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    name: str
    phone: str | None
    role: UserRole
    is_active: bool
    favorite_device_ids: list[UUID] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    favorite_device_ids: list[UUID] | None = Field(default=None, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    _password_strength = field_validator("new_password")(validate_password_strength)
