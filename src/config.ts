import { defaultAPIConfig, emulatorAPIConfig } from "@withorbit/api-client";

const shouldUseLocalBackend = process.env["NODE_ENV"] !== "production";
//const shouldUseLocalBackend = false;

export const apiConfig = shouldUseLocalBackend
  ? emulatorAPIConfig
  : defaultAPIConfig;

export const orbitWebappBaseURL = shouldUseLocalBackend
  ? "http://localhost:19006"
  : "https://withorbit.com";

export const orbitAuthAPIKey = shouldUseLocalBackend
  ? "fake-api-key"
  : process.env["FIREBASE_API_KEY"];

export const orbitAuthAPIBaseURL = shouldUseLocalBackend
  ? "http://localhost:9099/identitytoolkit.googleapis.com"
  : "https://identitytoolkit.googleapis.com";

export const orbitRefreshTokenURL = shouldUseLocalBackend
  ? "http://localhost:9099/securetoken.googleapis.com/v1/token?key=fake-api-key"
  : `https://securetoken.googleapis.com/v1/token?key=${orbitAuthAPIKey}`;
