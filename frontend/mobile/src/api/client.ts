import { API_BASE_URL } from "../config/api";

type ApiErrorDetail = {
  msg?: string;
};

type ApiErrorBody = {
  error?: string;
  message?: string;
  errors?: Record<string, string>;
  detail?: string | ApiErrorDetail | ApiErrorDetail[];
};

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | object | null;
  headers?: HeadersInit;
  token?: string;
};

function buildErrorMessage(status: number, body: ApiErrorBody | null): string {
  if (body?.error && body.error.trim()) {
    return body.error;
  }

  if (body?.message && body.message.trim()) {
    return body.message;
  }

  if (body?.errors && Object.keys(body.errors).length > 0) {
    const firstField = Object.keys(body.errors)[0];
    const firstMessage = body.errors[firstField];
    if (firstMessage?.trim()) {
      return firstMessage;
    }
  }

  const detail = body?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0 && detail[0]?.msg) {
    return detail[0].msg;
  }

  if (detail && typeof detail === "object" && !Array.isArray(detail) && detail.msg) {
    return detail.msg;
  }

  return `Request failed with status ${status}`;
}

export class ApiError extends Error {
  status: number;

  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(buildErrorMessage(status, body));
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(status: number, body: ApiErrorBody | null) {
    super(status, body);
    this.name = "UnauthorizedError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function normalizeBody(body: ApiRequestOptions["body"]): BodyInit | undefined {
  if (body == null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
}

export async function apiRequest<T>(
  path: string,
  { body, headers, token, ...init }: ApiRequestOptions = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    body: normalizeBody(body),
    headers: {
      Accept: "application/json",
      ...(body != null && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    }
  });

  const text = await response.text();
  let parsedBody: ApiErrorBody | null = null;

  if (text) {
    try {
      parsedBody = JSON.parse(text) as ApiErrorBody;
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError(response.status, parsedBody);
    }

    throw new ApiError(response.status, parsedBody);
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
