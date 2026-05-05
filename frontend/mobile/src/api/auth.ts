import { apiRequest } from "./client";
import type {
  AuthContextResponse,
  LoginPayload,
  RefreshPayload,
  TokenPairResponse,
  UserOut,
  RegisterPayload
} from "../types/auth";

export async function login(payload: LoginPayload): Promise<TokenPairResponse> {
  return apiRequest<TokenPairResponse>("/auth/login", {
    method: "POST",
    body: payload
  });
}

export async function register(payload: RegisterPayload): Promise<UserOut> {
  const fullName = payload.name.trim();
  const chunks = fullName.split(/\s+/).filter(Boolean);
  const firstName = chunks[0] || fullName || "User";
  const lastName = chunks.slice(1).join(" ") || "User";

  return apiRequest<UserOut>("/auth/register", {
    method: "POST",
    body: {
      email: payload.email,
      phone: payload.phone,
      firstName,
      lastName,
      password: payload.password,
      confirmPassword: payload.confirmPassword
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
