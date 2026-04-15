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
  return apiRequest<UserOut>("/auth/register", {
    method: "POST",
    body: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password
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
