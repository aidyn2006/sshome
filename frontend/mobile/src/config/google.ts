const DEFAULT_GOOGLE_IOS_CLIENT_ID =
  "903732736095-bakjr8igmgfg9pueolc19a9vjfee3ort.apps.googleusercontent.com";
const DEFAULT_GOOGLE_IOS_REVERSED_CLIENT_ID =
  "com.googleusercontent.apps.903732736095-bakjr8igmgfg9pueolc19a9vjfee3ort";

export const GOOGLE_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
export const GOOGLE_IOS_CLIENT_ID = (
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  DEFAULT_GOOGLE_IOS_CLIENT_ID
).trim();
export const GOOGLE_IOS_REVERSED_CLIENT_ID = (
  process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID ||
  DEFAULT_GOOGLE_IOS_REVERSED_CLIENT_ID
).trim();
