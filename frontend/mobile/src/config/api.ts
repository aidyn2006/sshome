import { Platform } from "react-native";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

function getDefaultApiBaseUrl(): string {
  if (Platform.OS === "web") {
    return "http://localhost:8888";
  }

  return "https://sshome.almatherm.kz/api";
}

function resolveApiBaseUrl(): string {
  if (!envApiBaseUrl) {
    return getDefaultApiBaseUrl();
  }

  if (Platform.OS !== "web" && /^http:\/\//i.test(envApiBaseUrl)) {
    const insecureHost = /^http:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d+)?(?:\/|$)/i;
    if (!insecureHost.test(envApiBaseUrl)) {
      return getDefaultApiBaseUrl();
    }
  }

  return envApiBaseUrl;
}

export const API_BASE_URL = trimTrailingSlash(resolveApiBaseUrl());
