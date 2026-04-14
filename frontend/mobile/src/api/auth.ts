import { API_BASE_URL } from "../config/api";
import type { LoginPayload, RegisterPayload, TokenPairResponse, UserOut } from "../types/auth";

type ApiErrorDetail = {
  msg?: string;
};

type ApiErrorBody = {
  detail?: string | ApiErrorDetail | ApiErrorDetail[];
};

function buildApiError(status: number, body: ApiErrorBody | null): Error {
  const detail = body?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return new Error(detail);
  }

  if (Array.isArray(detail) && detail.length > 0 && detail[0]?.msg) {
    return new Error(detail[0].msg);
  }

  if (detail && typeof detail === "object" && !Array.isArray(detail) && detail.msg) {
    return new Error(detail.msg);
  }

  return new Error(`Request failed with status ${status}`);
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  let body: ApiErrorBody | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as ApiErrorBody;
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    throw buildApiError(response.status, body);
  }

  return (body || {}) as T;
}

export async function login(payload: LoginPayload): Promise<TokenPairResponse> {
  return requestJson<TokenPairResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function register(payload: RegisterPayload): Promise<UserOut> {
  return requestJson<UserOut>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password
    })
  });
}
