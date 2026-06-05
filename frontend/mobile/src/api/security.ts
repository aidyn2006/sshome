import { apiRequest } from "./client";

export type AttackType = "MQTT_SPOOFING" | "BRUTE_FORCE" | "REPLAY" | "DDOS";

export type SecuritySeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SecurityEvent = {
  id: string;
  attack_type: AttackType;
  blocked: boolean;
  severity: SecuritySeverity;
  target: string | null;
  source_ip: string | null;
  message: string;
  sim_id: string | null;
  created_at: string;
};

export type SecurityStats = {
  total: number;
  blocked: number;
  not_blocked: number;
  by_type: Record<string, number>;
  telegram_configured: boolean;
};

export type SimulateAttackPayload = {
  attackType: AttackType;
  intensity?: number;
  targetHardwareId?: string;
  targetSecret?: string;
  targetEmail?: string;
};

export type SimulateAttackResult = {
  sim_id: string;
  attack_type: AttackType;
  summary: Record<string, unknown>;
};

export async function simulateAttack(
  token: string,
  payload: SimulateAttackPayload
): Promise<SimulateAttackResult> {
  return apiRequest<SimulateAttackResult>("/api/v1/security/simulate", {
    method: "POST",
    token,
    body: {
      attack_type: payload.attackType,
      intensity: payload.intensity,
      target_hardware_id: payload.targetHardwareId,
      target_secret: payload.targetSecret,
      target_email: payload.targetEmail
    }
  });
}

export async function listSecurityEvents(
  token: string,
  limit = 50,
  attackType?: AttackType
): Promise<SecurityEvent[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (attackType) {
    query.set("attack_type", attackType);
  }
  return apiRequest<SecurityEvent[]>(`/api/v1/security/events?${query.toString()}`, {
    method: "GET",
    token
  });
}

export async function getSecurityStats(token: string): Promise<SecurityStats> {
  return apiRequest<SecurityStats>("/api/v1/security/stats", {
    method: "GET",
    token
  });
}
