import { apiRequest } from "./client";
import type {
  AuthContextResponse,
  ChangePasswordPayload,
  GoogleLoginPayload,
  LoginPayload,
  PasswordResetConfirmPayload,
  PasswordResetMessageResponse,
  PasswordResetRequestPayload,
  PasswordResetVerifyPayload,
  RefreshPayload,
  TokenPairResponse,
  UpdateUserPayload,
  UserOut,
  RegisterPayload
} from "../types/auth";

export async function login(payload: LoginPayload): Promise<TokenPairResponse> {
  return apiRequest<TokenPairResponse>("/auth/login", {
    method: "POST",
    body: payload
  });
}

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<TokenPairResponse> {
  return apiRequest<TokenPairResponse>("/auth/google", {
    method: "POST",
    body: payload
  });
}

export async function register(payload: RegisterPayload): Promise<UserOut> {
  const name = payload.name.trim();
  const phone = payload.phone.trim();

  return apiRequest<UserOut>("/auth/register", {
    method: "POST",
    body: {
      email: payload.email.trim(),
      password: payload.password,
      name,
      phone: phone || null
    }
  });
}

export async function requestPasswordReset(payload: PasswordResetRequestPayload): Promise<PasswordResetMessageResponse> {
  return apiRequest<PasswordResetMessageResponse>("/auth/password-reset/request", {
    method: "POST",
    body: {
      email: payload.email.trim()
    }
  });
}

export async function verifyPasswordResetCode(payload: PasswordResetVerifyPayload): Promise<PasswordResetMessageResponse> {
  return apiRequest<PasswordResetMessageResponse>("/auth/password-reset/verify", {
    method: "POST",
    body: {
      email: payload.email.trim(),
      code: payload.code.trim()
    }
  });
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<PasswordResetMessageResponse> {
  return apiRequest<PasswordResetMessageResponse>("/auth/password-reset/confirm", {
    method: "POST",
    body: {
      email: payload.email.trim(),
      code: payload.code.trim(),
      new_password: payload.new_password
    }
  });
}

export async function refreshAccessToken(payload: RefreshPayload): Promise<{ access_token: string; token_type: string }> {
  return apiRequest<{ access_token: string; token_type: string }>("/auth/refresh", {
    method: "POST",
    body: payload
  });
}

export async function logout(payload: RefreshPayload, token: string): Promise<void> {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    token,
    body: payload
  });
}

export async function getAuthContext(token: string): Promise<AuthContextResponse> {
  return apiRequest<AuthContextResponse>("/api/v1/auth-context/me", {
    method: "GET",
    token
  });
}

export async function getCurrentUser(token: string): Promise<UserOut> {
  return apiRequest<UserOut>("/api/v1/users/me", {
    method: "GET",
    token
  });
}

export async function updateCurrentUser(token: string, payload: UpdateUserPayload): Promise<UserOut> {
  return apiRequest<UserOut>("/api/v1/users/me", {
    method: "PUT",
    token,
    body: payload
  });
}

export async function changePassword(token: string, payload: ChangePasswordPayload): Promise<void> {
  return apiRequest<void>("/api/v1/users/me/password", {
    method: "POST",
    token,
    body: payload
  });
}
