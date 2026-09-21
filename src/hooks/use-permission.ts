import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";

// UX-only gating: reads whatever permissions the backend attached to the
// current session (Phase 3A's role_permissions catalog, via /auth/login and
// /auth/me). The backend remains the authority - this never determines
// whether a specific record is in scope, only whether to show an action.
export function useHasPermission() {
  const { user } = useAuth();

  return useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );
}
