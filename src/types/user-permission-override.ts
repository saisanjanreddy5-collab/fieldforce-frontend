export type GrantType = "grant" | "revoke";

export interface UserPermissionOverride {
  id: string;
  userId: string;
  permission: string;
  grantType: GrantType;
  reason: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  clearedBy: string | null;
  clearedByName: string | null;
  clearedAt: string | null;
}

export interface CreateOverridePayload {
  userId: string;
  permission: string;
  grantType: GrantType;
  reason?: string;
  expiresAt?: string;
}
