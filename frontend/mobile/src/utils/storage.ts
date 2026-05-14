const KEYS = {
  ACCESS_TOKEN: "auth.accessToken",
  REFRESH_TOKEN: "auth.refreshToken",
} as const;

function store(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  const s = store();
  if (!s) return;
  s.setItem(KEYS.ACCESS_TOKEN, accessToken);
  s.setItem(KEYS.REFRESH_TOKEN, refreshToken);
}

export function loadTokens(): { accessToken: string; refreshToken: string } | null {
  const s = store();
  if (!s) return null;
  const accessToken = s.getItem(KEYS.ACCESS_TOKEN);
  if (!accessToken) return null;
  return { accessToken, refreshToken: s.getItem(KEYS.REFRESH_TOKEN) ?? "" };
}

export function clearTokens(): void {
  const s = store();
  if (!s) return;
  s.removeItem(KEYS.ACCESS_TOKEN);
  s.removeItem(KEYS.REFRESH_TOKEN);
}
