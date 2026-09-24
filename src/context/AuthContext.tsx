import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "../types/auth";
import * as authApi from "../api/auth-api";
import { clearTokens, getAccessToken, setTokens } from "../api/token-storage";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, [logout]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  }, []);

  // Re-fetches the current user - used after a self-service profile edit
  // (e.g. the calling number) so the rest of the app reflects it without
  // requiring a full page reload.
  const refreshUser = useCallback(async () => {
    const fresh = await authApi.fetchMe();
    setUser(fresh);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
