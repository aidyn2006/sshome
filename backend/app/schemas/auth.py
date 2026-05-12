from pydantic import BaseModel, EmailStr, Field
from pydantic import model_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class GoogleLoginRequest(BaseModel):
    id_token: str | None = Field(default=None, min_length=20)
    access_token: str | None = Field(default=None, min_length=20)

    @model_validator(mode="after")
    def require_google_token(self) -> "GoogleLoginRequest":
        if not self.id_token and not self.access_token:
            raise ValueError("Google token is required")
        return self


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LogoutRequest(BaseModel):
    refresh_token: str
