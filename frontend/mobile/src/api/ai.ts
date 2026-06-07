import { apiRequest } from "./client";
import type { ApiDevice } from "./smartHome";
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

export type AIAssistantDeviceAction = {
  device_id: string;
  action: DeviceAction;
};

export type AIAssistantControlProposal = {
  actions: AIAssistantDeviceAction[];
  explanation: string;
};

export type AIAssistantScenarioRunProposal = {
  scenario_id: string;
  name: string;
  explanation: string;
};

export type AIAssistantChatResponse = {
  answer: string;
  scenario_draft: AIScenarioDraft | null;
  control_proposal: AIAssistantControlProposal | null;
  scenario_run: AIAssistantScenarioRunProposal | null;
};

export type AIAssistantActionExecutionResult = {
  message: string;
  executed_actions: Array<{
    device: ApiDevice;
    action: DeviceAction;
  }>;
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

export async function sendAssistantMessage(
  token: string,
  message: string
): Promise<AIAssistantChatResponse> {
  return apiRequest<AIAssistantChatResponse>("/api/v1/ai/chat", {
    method: "POST",
    token,
    body: { message },
    timeoutMs: 30000
  });
}

export async function confirmAssistantDeviceActions(
  token: string,
  actions: AIAssistantDeviceAction[]
): Promise<AIAssistantActionExecutionResult> {
  return apiRequest<AIAssistantActionExecutionResult>("/api/v1/ai/confirm-device-actions", {
    method: "POST",
    token,
    body: { actions },
    timeoutMs: 20000
  });
}
