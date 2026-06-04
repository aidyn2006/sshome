import AsyncStorage from "@react-native-async-storage/async-storage";

// AsyncStorage works on iOS/Android and falls back to localStorage on web,
// so tokens and favorites survive app restarts on every platform.

const KEYS = {
  ACCESS_TOKEN: "auth.accessToken",
  REFRESH_TOKEN: "auth.refreshToken",
  FAVORITES_PREFIX: "favorites.",
} as const;

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEYS.ACCESS_TOKEN, accessToken],
      [KEYS.REFRESH_TOKEN, refreshToken],
    ]);
  } catch {
    // Persistence is best-effort; the in-memory session still works.
  }
}

export async function loadTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const entries = await AsyncStorage.multiGet([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN]);
    const accessToken = entries[0]?.[1];
    if (!accessToken) {
      return null;
    }
    return { accessToken, refreshToken: entries[1]?.[1] ?? "" };
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN]);
  } catch {
    // ignore
  }
}

export async function saveFavorites(userKey: string, deviceIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${KEYS.FAVORITES_PREFIX}${userKey}`, JSON.stringify(deviceIds));
  } catch {
    // ignore
  }
}

export async function loadFavorites(userKey: string): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${KEYS.FAVORITES_PREFIX}${userKey}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : null;
  } catch {
    return null;
  }
}
