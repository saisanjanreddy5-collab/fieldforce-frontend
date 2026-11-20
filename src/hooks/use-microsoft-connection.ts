import { useCallback } from "react";
import { App } from "antd";
import * as microsoftApi from "../api/microsoft-api";
import type { MicrosoftConnectionStatus } from "../types/microsoft";
import { useCachedResource } from "../utils/cached-resource";
import { errorMessageFrom } from "../utils/api-error";

const NOT_CONNECTED: MicrosoftConnectionStatus = { connected: false, email: null };

// The signed-in user's Microsoft 365 connection, fetched once and shared by
// every screen that offers Email/Teams (see utils/cached-resource.ts), plus
// the one Connect / Disconnect flow - failures are shown, never swallowed.
export function useMicrosoftConnection() {
  const { message } = App.useApp();
  const { data, loading, refetch } = useCachedResource(microsoftApi.microsoftStatusResource);

  const refresh = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  const connect = useCallback(async () => {
    try {
      const authUrl = await microsoftApi.getConnectUrl(window.location.pathname);
      window.location.href = authUrl;
    } catch (err) {
      message.error(errorMessageFrom(err, "Couldn't start the Microsoft 365 sign-in"));
    }
  }, [message]);

  const disconnect = useCallback(async () => {
    try {
      await microsoftApi.disconnect();
      message.success("Microsoft 365 disconnected");
    } catch (err) {
      message.error(errorMessageFrom(err, "Couldn't disconnect Microsoft 365"));
    }
  }, [message]);

  return { ...(data ?? NOT_CONNECTED), loading, connect, disconnect, refresh };
}
