import { apiClient } from "./api-client";
import type { AuthUser, LoginResponse } from "../types/auth";
import type { ApiSuccess } from "../types/api";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<ApiSuccess<LoginResponse>>("/auth/login", { email, password });
  return response.data.data;
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await apiClient.get<ApiSuccess<AuthUser>>("/auth/me");
  return response.data.data;
}
