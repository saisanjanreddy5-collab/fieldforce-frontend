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

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;

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
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newAccessToken = await refreshPromise;
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
