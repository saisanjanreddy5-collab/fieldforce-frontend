import type { Role } from "./auth";

export interface RolePermissionMatrix {
  catalog: string[];
  roles: Role[];
  grants: Record<Role, string[]>;
}
