import { useCallback, useState } from "react";
import { App } from "antd";
import * as smartfloApi from "../api/smartflo-api";
import { useAuth } from "../context/AuthContext";
import { errorMessageFrom } from "../utils/api-error";

export interface CallTarget {
  /** The call is placed and logged against this lead. */
  leadId: string;
  name: string;
  phone: string | null;
  /** Dial one of the lead's contacts instead of the lead's own number. */
  contact?: { phone: string; contactName?: string };
  /** Identifies which button is busy when a screen has several (e.g. a list). */
  key?: string;
  /** Runs after the call has been placed (e.g. reload, mark the task done). */
  onPlaced?: () => void;
}

// The one click-to-call flow for every Call button: the caller must have a
// calling number set, and confirms before a real phone call is placed (their
// own phone rings first). Several screens used to dial straight away with
// neither check.
export function useClickToCall() {
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const [callingKey, setCallingKey] = useState<string | null>(null);

  const call = useCallback(
    (target: CallTarget) => {
      if (!user?.smartfloAgentNumber) {
        message.error("Set your calling number from your profile (top right) first");
        return;
      }
      const dialled = target.contact?.phone ?? target.phone;
      modal.confirm({
        title: `Call ${target.contact?.contactName ?? target.name}?`,
        content: `Calling from ${user.smartfloAgentNumber} to ${dialled ?? "their number"}. Your phone rings first - answer it to connect.`,
        okText: "Call now",
        onOk: async () => {
          setCallingKey(target.key ?? target.leadId);
          try {
            await smartfloApi.callLead(target.leadId, target.contact);
            message.success("Call started - answer your phone to connect");
            target.onPlaced?.();
          } catch (err) {
            message.error(errorMessageFrom(err, "Failed to start the call"));
          } finally {
            setCallingKey(null);
          }
        },
      });
    },
    [user?.smartfloAgentNumber, message, modal]
  );

  return { call, callingKey };
}
