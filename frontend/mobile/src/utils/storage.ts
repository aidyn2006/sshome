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
    await Promise.all([
      AsyncStorage.setItem(KEYS.ACCESS_TOKEN, accessToken),
      AsyncStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  } catch {
    // Persistence is best-effort; the in-memory session still works.
  }
}

export async function loadTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem(KEYS.ACCESS_TOKEN),
      AsyncStorage.getItem(KEYS.REFRESH_TOKEN),
    ]);
    if (!accessToken) {
      return null;
    }
    return { accessToken, refreshToken: refreshToken ?? "" };
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(KEYS.REFRESH_TOKEN),
    ]);
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
