import { apiRequest } from "./client";
import type { DeviceAction } from "../types/smartHome";

export type AIScenarioDraftAction = {
  device_id: string;
  action: DeviceAction;
};

export type AIScenarioDraft = {
  name: string;
  description: string | null;
  actions: AIScenarioDraftAction[];
  explanation: string;
};

export async function generateScenarioDraft(
  token: string,
  prompt: string
): Promise<AIScenarioDraft> {
  return apiRequest<AIScenarioDraft>("/api/v1/ai/scenario-draft", {
    method: "POST",
    token,
    body: { prompt },
    timeoutMs: 25000
  });
}
