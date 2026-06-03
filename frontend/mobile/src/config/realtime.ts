import { API_BASE_URL } from "./api";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Builds the devices WebSocket URL for the current runtime.
 * Docker/nginx uses EXPO_PUBLIC_API_BASE_URL=/api → ws(s)://<host>/api/ws/devices
 */
export function buildDevicesWebSocketUrl(accessToken: string): string {
  const base = trimTrailingSlash(API_BASE_URL);
  const query = `token=${encodeURIComponent(accessToken)}`;

  if (base.startsWith("https://")) {
    return `${base.replace(/^https:/, "wss:")}/ws/devices?${query}`;
  }

  if (base.startsWith("http://")) {
    return `${base.replace(/^http:/, "ws:")}/ws/devices?${query}`;
  }

  const wsPath = `${base.startsWith("/") ? base : `/${base}`}/ws/devices`;

  const location = typeof globalThis !== "undefined" ? globalThis.location : undefined;
  if (location?.host) {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${location.host}${wsPath}?${query}`;
  }

  return `ws://localhost:8000/ws/devices?${query}`;
}
