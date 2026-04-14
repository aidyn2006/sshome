import { Platform } from "react-native";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

const defaultApiBaseUrl =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

export const API_BASE_URL = trimTrailingSlash(envApiBaseUrl || defaultApiBaseUrl);
