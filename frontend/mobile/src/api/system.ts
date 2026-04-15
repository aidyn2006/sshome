import { apiRequest } from "./client";

export type HealthResponse = {
  status: string;
};

export async function getBackendHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health", {
    method: "GET",
    signal
  });
}
