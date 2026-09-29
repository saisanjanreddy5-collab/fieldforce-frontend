import type { IntegrationsStatus } from "../../api/integrations-api";
import type { MicrosoftConnectionStatus } from "../../types/microsoft";

export type IntegrationRowStatus = "connected" | "org_configured" | "not_connected";

export interface IntegrationRow {
  key: string;
  name: string;
  scope: string;
  description: string;
  status: IntegrationRowStatus;
  detail?: string;
}

// Single source of truth for the Integrations tab's inline table and its
// "Connect a service" modal, so the two surfaces can never drift into
// showing different connection states for the same service.
export function buildIntegrationRows(microsoft: MicrosoftConnectionStatus, org: IntegrationsStatus | null): IntegrationRow[] {
  return [
    {
      key: "microsoft",
      name: "Microsoft 365",
      scope: "Graph API · per-user",
      description: "Send/receive mail, sync your calendar, and create Teams meetings as your own Microsoft 365 account.",
      status: microsoft.connected ? "connected" : "not_connected",
      detail: microsoft.connected ? microsoft.email ?? undefined : undefined,
    },
    {
      key: "whatsapp",
      name: "WhatsApp Business API",
      scope: "Meta · via K3 Digital Media",
      description: "Template and free-text messaging with consent checks, on the shared business number.",
      status: org?.whatsapp ? "org_configured" : "not_connected",
    },
    {
      key: "smartflo",
      name: "Calling (Tata Tele Smartflo)",
      scope: "Click-to-call",
      description: "Click-to-call and call outcome tracking from any lead or activity.",
      status: org?.smartflo ? "org_configured" : "not_connected",
    },
    {
      key: "fofo_push",
      name: "FOFO onboarding app",
      scope: "Internal",
      description: "Store payload push and status - tracked inside FieldForce only, no external endpoint is configured yet.",
      status: "not_connected",
    },
    {
      key: "teams_maestro",
      name: "Teams Maestro AI",
      scope: "Webhook",
      description: "Automatic call/meeting recording, transcripts and AI summaries into the activity timeline.",
      status: "not_connected",
    },
    {
      key: "sap",
      name: "SAP Business One",
      scope: "DI API",
      description: "Customer, order and invoice sync with your back office.",
      status: "not_connected",
    },
    {
      key: "cbo_fsm",
      name: "CBO / FSM",
      scope: "Pending",
      description: "Field service and back-office integration.",
      status: "not_connected",
    },
  ];
}

export const STATUS_LABEL: Record<IntegrationRowStatus, string> = {
  connected: "Connected",
  org_configured: "Connected",
  not_connected: "Not connected",
};
