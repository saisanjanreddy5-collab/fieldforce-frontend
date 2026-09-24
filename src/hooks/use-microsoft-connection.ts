import { useCallback, useEffect, useState } from "react";
import * as microsoftApi from "../api/microsoft-api";
import type { MicrosoftConnectionStatus } from "../types/microsoft";

export function useMicrosoftConnection() {
  const [status, setStatus] = useState<MicrosoftConnectionStatus>({ connected: false, email: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    microsoftApi
      .getStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  const connect = useCallback(async () => {
    const authUrl = await microsoftApi.getConnectUrl(window.location.pathname);
    window.location.href = authUrl;
  }, []);

  const disconnect = useCallback(async () => {
    await microsoftApi.disconnect();
    refresh();
  }, [refresh]);

  return { ...status, loading, connect, disconnect, refresh };
}
