import { Platform } from "react-native";
import Constants from "expo-constants";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

function getHostFromExpo(): string | null {
  const constantsAny = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    manifest?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
  };

  const hostUri =
    constantsAny.expoConfig?.hostUri ||
    constantsAny.manifest2?.extra?.expoGo?.debuggerHost ||
    constantsAny.manifest?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  const [host] = hostUri.split(":");
  return host || null;
}

function getDefaultApiBaseUrl(): string {
  if (Platform.OS === "web") {
    return "http://localhost:8099";
  }

  const lanHost = getHostFromExpo();
  if (lanHost) {
    return `http://${lanHost}:8099`;
  }

  return Platform.OS === "android" ? "http://10.0.2.2:8099" : "http://localhost:8099";
}

export const API_BASE_URL = trimTrailingSlash(envApiBaseUrl || getDefaultApiBaseUrl());
