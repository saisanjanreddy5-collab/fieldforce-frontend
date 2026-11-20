import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from "./token-storage";
import type { ApiSuccess } from "../types/api";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // Needed so the backend's ff_sso_session cookie (set on login, read by
  // GET /sso/authorize when Frappe Helpdesk redirects here) actually gets
  // stored - a cross-origin response's Set-Cookie is otherwise dropped.
  withCredentials: true,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

// Every caller waiting on a refresh shares one /auth/refresh request.
function sharedRefresh(): Promise<string> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

// Reads the access token's own expiry (a JWT's "exp", in seconds). Unreadable
// tokens count as fresh - the server's 401 then decides, as before.
function expiresWithin(token: string, ms: number): boolean {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = (JSON.parse(atob(part)) as { exp?: unknown }).exp;
    return typeof exp === "number" && exp * 1000 < Date.now() + ms;
  } catch {
    return false;
  }
}

apiClient.interceptors.request.use(async (config) => {
  let token = getAccessToken();
  // An expired token is refreshed before the request goes out - waiting
  // for the server to reject it first cost two extra round trips (401 ->
  // refresh -> retry) on the first screen of every session.
  if (token && getRefreshToken() && expiresWithin(token, 10_000)) {
    try {
      token = await sharedRefresh();
    } catch {
      // Fall through with the old token; the 401 handling below decides.
    }
  }
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post<ApiSuccess<{ accessToken: string }>>(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
    { refreshToken }
  );

  const newAccessToken = response.data.data.accessToken;
  setAccessToken(newAccessToken);
  return newAccessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await sharedRefresh();
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Only a genuinely dead session (no refresh token, or the server
        // rejecting it as invalid/expired) ends the login. A network blip,
        // a backend restart mid-deploy, or a rate-limit response is
        // temporary - logging everyone out for those would be far worse
        // than letting this one request fail.
        const refreshStatus = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
        const sessionIsDead = !getRefreshToken() || refreshStatus === 401 || refreshStatus === 422;
        if (sessionIsDead) {
          clearTokens();
          window.dispatchEvent(new Event("auth:logout"));
        }
      }
    }

    return Promise.reject(error);
  }
);
