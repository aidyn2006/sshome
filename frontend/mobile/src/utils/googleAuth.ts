import { Platform } from "react-native";

import { GOOGLE_CLIENT_ID } from "../config/google";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_CALLBACK_PATH = "/auth/google/callback";
const POPUP_MESSAGE_TYPE = "sshome-google-auth";

type GooglePopupMessage = {
  type: typeof POPUP_MESSAGE_TYPE;
  state: string | null;
  idToken?: string | null;
  error?: string | null;
};

function assertWeb(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    throw new Error("Google sign-in is only configured for the web app");
  }
}

function randomString(): string {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = new Uint32Array(4);
    window.crypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(16)).join("");
  }

  return `${Date.now()}${Math.random()}`;
}

function getPopupFeatures(width: number, height: number): string {
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${Math.max(left, 0)}`,
    `top=${Math.max(top, 0)}`,
    "resizable=yes",
    "scrollbars=yes"
  ].join(",");
}

function parseCallbackParams(): URLSearchParams {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if ([...hashParams.keys()].length > 0) {
    return hashParams;
  }

  return new URLSearchParams(window.location.search.replace(/^\?/, ""));
}

export function completeGooglePopupRedirect(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== GOOGLE_CALLBACK_PATH) {
    return;
  }

  const params = parseCallbackParams();
  const message: GooglePopupMessage = {
    type: POPUP_MESSAGE_TYPE,
    state: params.get("state"),
    idToken: params.get("id_token"),
    error: params.get("error_description") || params.get("error")
  };

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(message, window.location.origin);
    window.close();
    return;
  }

  window.history.replaceState(null, "", "/");
}

export function requestGoogleIdToken(): Promise<string> {
  assertWeb();

  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google sign-in is not configured");
  }

  const state = randomString();
  const nonce = randomString();
  const redirectUri = `${window.location.origin}${GOOGLE_CALLBACK_PATH}`;
  const authUrl = new URL(GOOGLE_AUTH_URL);

  authUrl.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "id_token token",
    scope: "openid email profile",
    nonce,
    state,
    prompt: "select_account"
  }).toString();

  return new Promise((resolve, reject) => {
    const popup = window.open(authUrl.toString(), "sshome_google_auth", getPopupFeatures(500, 680));

    if (!popup) {
      reject(new Error("Allow popups to sign in with Google"));
      return;
    }

    let settled = false;
    let closeTimer: number | undefined;
    let timeoutTimer: number | undefined;
    let handleMessage = (_event: MessageEvent<GooglePopupMessage>) => {};

    const cleanup = () => {
      settled = true;
      window.removeEventListener("message", handleMessage);
      if (closeTimer !== undefined) {
        window.clearInterval(closeTimer);
      }
      if (timeoutTimer !== undefined) {
        window.clearTimeout(timeoutTimer);
      }

      if (!popup.closed) {
        popup.close();
      }
    };

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      cleanup();
      callback();
    };

    handleMessage = (event: MessageEvent<GooglePopupMessage>) => {
      if (event.origin !== window.location.origin || event.data?.type !== POPUP_MESSAGE_TYPE) {
        return;
      }

      if (event.data.state !== state) {
        return;
      }

      if (event.data.error) {
        finish(() => reject(new Error(event.data.error || "Google sign-in failed")));
        return;
      }

      if (!event.data.idToken) {
        finish(() => reject(new Error("Google did not return an identity token")));
        return;
      }

      finish(() => resolve(event.data.idToken as string));
    };

    closeTimer = window.setInterval(() => {
      if (popup.closed) {
        finish(() => reject(new Error("Google sign-in was cancelled")));
      }
    }, 500);

    timeoutTimer = window.setTimeout(() => {
      finish(() => reject(new Error("Google sign-in timed out")));
    }, 5 * 60 * 1000);

    window.addEventListener("message", handleMessage);
    popup.focus();
  });
}
