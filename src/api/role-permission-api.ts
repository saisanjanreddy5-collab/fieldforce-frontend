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

export async function resetRoleToDefault(role: Role): Promise<RolePermissionMatrix> {
  const response = await apiClient.post<ApiSuccess<RolePermissionMatrix>>("/role-permissions/reset", { role });
  return response.data.data;
}

// Temporary, reversible elevation - mirrors Admin's current live
// permissions onto this role. Pair with resetRoleToDefault above to put the
// role back once a review/demo is done.
export async function grantAdminAccess(role: Role): Promise<RolePermissionMatrix> {
  const response = await apiClient.post<ApiSuccess<RolePermissionMatrix>>("/role-permissions/grant-admin-access", { role });
  return response.data.data;
}
