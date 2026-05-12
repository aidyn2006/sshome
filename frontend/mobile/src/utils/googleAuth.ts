import { Platform } from "react-native";

import { GOOGLE_CLIENT_ID } from "../config/google";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type GoogleIdentityApi = {
  accounts?: {
    oauth2?: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        prompt?: string;
        callback: (response: GoogleTokenResponse) => void;
      }) => GoogleTokenClient;
    };
  };
};

type WindowWithGoogle = Window &
  typeof globalThis & {
    google?: GoogleIdentityApi;
  };

let scriptPromise: Promise<void> | null = null;

function getWebWindow(): WindowWithGoogle {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    throw new Error("Google sign-in is only configured for the web app");
  }

  return window as WindowWithGoogle;
}

export function preloadGoogleIdentity(): Promise<void> {
  const webWindow = getWebWindow();

  if (webWindow.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Google sign-in")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google sign-in"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function requestGoogleAccessToken(): Promise<string> {
  const webWindow = getWebWindow();

  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google sign-in is not configured");
  }

  await preloadGoogleIdentity();

  const oauth2 = webWindow.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Google sign-in is not available");
  }

  return new Promise((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      prompt: "select_account",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error("Google did not return an access token"));
          return;
        }

        resolve(response.access_token);
      }
    });

    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
}
