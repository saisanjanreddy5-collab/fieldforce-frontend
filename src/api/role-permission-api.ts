import { apiClient } from "./api-client";
import type { ApiSuccess } from "../types/api";
import type { RolePermissionMatrix } from "../types/role-permission";
import type { Role } from "../types/auth";

export async function getRolePermissionMatrix(): Promise<RolePermissionMatrix> {
  const response = await apiClient.get<ApiSuccess<RolePermissionMatrix>>("/role-permissions");
  return response.data.data;
}

export async function setRolePermission(role: Role, permission: string, granted: boolean): Promise<RolePermissionMatrix> {
  const response = await apiClient.patch<ApiSuccess<RolePermissionMatrix>>("/role-permissions", { role, permission, granted });
  return response.data.data;
}
