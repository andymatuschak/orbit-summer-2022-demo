import { defaultAPIConfig, emulatorAPIConfig } from "@withorbit/api-client";

const shouldUseLocalBackend = process.env["NODE_ENV"] !== "production";
// const shouldUseLocalBackend = false;

export const apiConfig = shouldUseLocalBackend
  ? emulatorAPIConfig
  : defaultAPIConfig;

export const orbitWebappBaseURL = shouldUseLocalBackend
  ? "http://localhost:19006"
  : "https://orbit-app--fall-2022-yzhqe6jr.web.app";

export const orbitAuthAPIKey = shouldUseLocalBackend
  ? "fake-api-key"
  : process.env["REACT_APP_FIREBASE_API_KEY"];

export const orbitAuthAPIBaseURL = shouldUseLocalBackend
  ? "http://localhost:9099/identitytoolkit.googleapis.com"
  : "https://identitytoolkit.googleapis.com";

export const orbitRefreshTokenURL = shouldUseLocalBackend
  ? "http://localhost:9099/securetoken.googleapis.com/v1/token?key=fake-api-key"
  : `https://securetoken.googleapis.com/v1/token?key=${orbitAuthAPIKey}`;

export const prototypeBackendBaseURL = `${
  process.env["NODE_ENV"] === "production"
    ? "https://orbit-summer-2022-demo-backend.vercel.app"
    : "http://localhost:3010"
}/api`;
