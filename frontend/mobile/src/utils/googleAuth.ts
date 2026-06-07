import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import {
  GOOGLE_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_IOS_REVERSED_CLIENT_ID,
} from "../config/google";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_SCOPES = ["openid", "profile", "email"];
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
  userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
};

WebBrowser.maybeCompleteAuthSession();

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

async function requestWebGoogleAccessToken(): Promise<string> {
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
      scope: GOOGLE_SCOPES.join(" "),
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

function getNativeGoogleClientId(): string {
  if (Platform.OS === "ios") {
    return GOOGLE_IOS_CLIENT_ID;
  }

  return "";
}

async function requestNativeGoogleAccessToken(): Promise<string> {
  const clientId = getNativeGoogleClientId();

  if (!clientId) {
    throw new Error("Google sign-in is not configured for this platform");
  }

  const redirectUri = AuthSession.makeRedirectUri({
    path: "oauthredirect",
    scheme: GOOGLE_IOS_REVERSED_CLIENT_ID,
  });
  const request = await AuthSession.loadAsync(
    {
      clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: GOOGLE_SCOPES,
      prompt: AuthSession.Prompt.SelectAccount,
      usePKCE: true,
    },
    GOOGLE_DISCOVERY
  );
  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Google sign-in was cancelled");
  }

  if (result.type === "error") {
    throw new Error(result.error?.message || result.params.error_description || "Google sign-in failed");
  }

  if (result.type !== "success") {
    throw new Error("Google sign-in did not complete");
  }

  const code = result.params.code;
  if (!code) {
    throw new Error("Google did not return an authorization code");
  }

  if (!request.codeVerifier) {
    throw new Error("Google sign-in did not return a PKCE verifier");
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri,
      scopes: GOOGLE_SCOPES,
      extraParams: {
        code_verifier: request.codeVerifier,
      },
    },
    GOOGLE_DISCOVERY
  );

  if (!tokenResponse.accessToken) {
    throw new Error("Google did not return an access token");
  }

  return tokenResponse.accessToken;
}

export async function requestGoogleAccessToken(): Promise<string> {
  if (Platform.OS === "web") {
    return requestWebGoogleAccessToken();
  }

  return requestNativeGoogleAccessToken();
}
