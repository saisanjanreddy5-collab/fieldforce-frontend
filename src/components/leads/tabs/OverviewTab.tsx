import { useEffect, useMemo, useState } from "react";
import { Col, Descriptions, Progress, Row, Tag, Typography, message } from "antd";
import type { Lead, LeadConsent } from "../../../types/lead";
import * as leadApi from "../../../api/lead-api";
import * as salesTeamApi from "../../../api/sales-team-api";
import { formatCompactCurrency, formatDate } from "../../../utils/lead-format";
import { appTokens } from "../../../utils/design-system";
import { useHasPermission } from "../../../hooks/use-permission";
import { ConsentTab } from "./ConsentTab";

const { Text } = Typography;

// Every field listed here must also appear as a rendered Descriptions.Item
// below for the same section, and vice versa - the synopsis fill-count and
// the displayed fields always represent the same data. Each section's list
// is also exactly the fields the Edit lead form has on its matching tab
// (LeadFormDrawer's TAB_FIELDS), so "x/N" here is the same N as the form -
// Status and Salesperson are shown but not counted: they change through
// actions (stage buttons, Reassign / Send to Field Sales), not that form.
// Inquiry Source is ONE field: a bulk-imported lead keeps its source in
// `source`, a manually entered one in `inquirySource` (the rest of the app -
// list filter, reports - already treats them as one), so it's shown and
// counted from whichever is set.
const SECTION_FIELDS: Record<string, (keyof Lead)[]> = {
  customer: [
    "fullName",
    "contactName",
    "profession",
    "startDate",
    "qualifiedPerson",
    "financialStatus",
    "prospectStatus",
    "category",
    "leadScore",
  ],
  contact: [
    "phone",
    "altPhone",
    "email",
    "website",
    "preferredLanguage",
    "pincode",
    "stateId",
    "addressLine1",
    "addressLine2",
    "territory",
  ],
  inquiry: [
    "companyName",
    "inquiryCategory",
    "inquirySource",
    "captureChannel",
    "utmTags",
    "expectedValue",
    "receivedAt",
    "internalNotes",
    "rmRemark",
    "lgRemark",
  ],
  store: [
    "hasStoreLocation",
    "storeName",
    "storeAddress",
    "storePincode",
    "storeCity",
    "storeState",
    "carpetArea",
    "frontage",
    "ownership",
    "investmentCapacity",
    "existingBusiness",
    "expectedOpening",
    "gstNumber",
    "panNumber",
    "drugLicenceNumber",
    "fssaiNumber",
  ],
};

const SECTION_LABELS: Record<string, string> = {
  customer: "Customer",
  contact: "Contact & address",
  inquiry: "Inquiry",
  store: "Store information",
  consent: "Consent",
};

// Consent's fields live on a separately-fetched LeadConsent record, not on
// Lead itself, so its fill-count is computed from that fetch result instead
// of SECTION_FIELDS.
const CONSENT_FIELD_COUNT = 5; // captured, method, purposes, evidenceRef, notes

function countConsentFilled(consent: LeadConsent | null): number {
  if (!consent) return 0;
  let n = 0;
  if (consent.captured) n += 1;
  if (consent.method) n += 1;
  if (consent.purposes) n += 1;
  if (consent.evidenceRef) n += 1;
  if (consent.notes) n += 1;
  return n;
}

// The lead's real value for a field - Inquiry Source falls back to the
// bulk-import `source` (see SECTION_FIELDS' comment).
function effectiveInquirySource(lead: Lead): string | null {
  return lead.inquirySource || lead.source || null;
}

function countFilled(lead: Lead, fields: (keyof Lead)[]): number {
  return fields.filter((field) => {
    const value = field === "inquirySource" ? effectiveInquirySource(lead) : lead[field];
    return value !== null && value !== undefined && value !== "";
  }).length;
}

// State names for the Contact section's State row - fetched once per page
// load and shared by every lead opened, not refetched per lead.
let statesPromise: Promise<Map<string, string>> | null = null;
function loadStateNames(): Promise<Map<string, string>> {
  statesPromise ??= salesTeamApi
    .listStates()
    .then((states) => new Map(states.map((s) => [s.id, s.name])))
    .catch(() => {
      statesPromise = null; // try again next time rather than caching a failure
      return new Map<string, string>();
    });
  return statesPromise;
}

function yesNo(value: boolean | null): string {
  if (value === null) return "-";
  return value ? "Yes" : "No";
}

interface OverviewTabProps {
  lead: Lead;
}

export function OverviewTab({ lead }: OverviewTabProps) {
  const hasPermission = useHasPermission();
  // Consent lives behind leads.view (see ConsentTab/lead-routes.ts's own
  // GET /:id/consent) - Call Center holds leads.queue_view instead, by
  // design, so fetching this unconditionally was the one thing still
  // producing a "Failed to load consent" toast on every lead they opened,
  // even after the rest of this page learned to ask first.
  const canViewConsent = hasPermission("leads.view");
  const [activeSection, setActiveSection] = useState<string>("customer");
  const [consent, setConsent] = useState<LeadConsent | null>(null);
  const [consentLoaded, setConsentLoaded] = useState(!canViewConsent);
  const [stateNames, setStateNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!lead.stateId) return;
    let alive = true;
    loadStateNames().then((names) => alive && setStateNames(names));
    return () => {
      alive = false;
    };
  }, [lead.stateId]);

  // Fetched once here (not inside ConsentTab) so the synopsis count and the
  // Consent section itself share the same data - see ConsentTab's `consent`
  // prop, which skips its own fetch when given this.
  useEffect(() => {
    if (!canViewConsent) return;
    leadApi
      .getLeadConsent(lead.id)
      .then(setConsent)
      .catch(() => message.error("Failed to load consent"))
      .finally(() => setConsentLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const sectionProgress = useMemo(() => {
    const fromLead = Object.entries(SECTION_FIELDS).map(([key, fields]) => ({
      key,
      label: SECTION_LABELS[key],
      filled: countFilled(lead, fields),
      total: fields.length,
    }));
    if (!canViewConsent) return fromLead;
    return [
      ...fromLead,
      { key: "consent", label: SECTION_LABELS.consent, filled: countConsentFilled(consent), total: CONSENT_FIELD_COUNT },
    ];
  }, [lead, consent, canViewConsent]);

  return (
    <div
      style={{
        border: `1px solid ${appTokens.border}`,
        borderRadius: appTokens.radius,
        background: appTokens.surface,
        boxShadow: appTokens.shadowSm,
        overflow: "hidden",
      }}
    >
    <Row gutter={0}>
      <Col
        xs={24}
        md={8}
        style={{
          padding: 16,
          borderRight: `1px solid ${appTokens.borderLight}`,
        }}
      >
          <Text style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: appTokens.textTertiary }}>
            Synopsis
          </Text>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {sectionProgress.map((section) => (
            <div
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              style={{
                cursor: "pointer",
                padding: "8px 10px",
                borderRadius: appTokens.radiusSm,
                background: activeSection === section.key ? appTokens.primarySoft : "transparent",
                borderLeft: activeSection === section.key ? `3px solid ${appTokens.primary}` : "3px solid transparent",
                transition: "background 0.12s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <Text strong={activeSection === section.key} style={{ color: appTokens.textPrimary, fontSize: 13.5, minWidth: 0 }}>
                  {section.label}
                </Text>
                <Text style={{ color: appTokens.textTertiary, fontSize: 12.5, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {section.filled}/{section.total}
                </Text>
              </div>
              <Progress
                percent={(section.filled / section.total) * 100}
                showInfo={false}
                size="small"
                strokeColor={section.filled === section.total ? appTokens.success : appTokens.primary}
              />
            </div>
          ))}
          </div>
      </Col>
      <Col xs={24} md={16} style={{ padding: 16 }}>
        {activeSection === "customer" && (
          <Descriptions column={1} size="small" title="Customer">
            <Descriptions.Item label="Full Name">{lead.fullName}</Descriptions.Item>
            <Descriptions.Item label="Contact Name">{lead.contactName ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Profession">{lead.profession ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Start Date">{formatDate(lead.startDate)}</Descriptions.Item>
            <Descriptions.Item label="Qualified Person">{lead.qualifiedPerson ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Financial Status">{lead.financialStatus ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Prospect Status">{lead.prospectStatus ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Category">{lead.category ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Lead Score">{lead.leadScore !== null && lead.leadScore !== undefined ? `${lead.leadScore}%` : "-"}</Descriptions.Item>
          </Descriptions>
        )}
        {activeSection === "customer" && (
          // Not form fields (see SECTION_FIELDS' comment) - shown, not counted.
          <Descriptions column={1} size="small" style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${appTokens.borderLight}` }}>
            <Descriptions.Item label="Stage">{lead.status}</Descriptions.Item>
            <Descriptions.Item label="Salesperson">{lead.ownerName ?? "Unassigned"}</Descriptions.Item>
          </Descriptions>
        )}
        {activeSection === "contact" && (
          <Descriptions column={1} size="small" title="Contact & address">
            <Descriptions.Item label="Phone">{lead.phone ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Alternative Mobile">{lead.altPhone ?? "-"}</Descriptions.Item>
            {/* Deliberately excluded from SECTION_FIELDS/the fill-count above -
                this is a system status flag (always true or false), not
                user-supplied data, so counting it would always read as
                "filled" and inflate Contact's completion percentage for
                every lead regardless of whether contact info is real. */}
            <Descriptions.Item label="Welcome Message">
              {lead.welcomeMessageSent ? (
                <Tag color="green">Sent</Tag>
              ) : (
                <Tag color="default">{lead.phone ? "Not sent" : "No phone on file"}</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Email">{lead.email ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Website">{lead.website ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Preferred Language">{lead.preferredLanguage ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="PinCode">{lead.pincode ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="State">{lead.stateId ? (stateNames.get(lead.stateId) ?? "…") : "-"}</Descriptions.Item>
            <Descriptions.Item label="Address">
              {[lead.addressLine1, lead.addressLine2].filter(Boolean).join(", ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Territory">{lead.territory ?? "-"}</Descriptions.Item>
          </Descriptions>
        )}
        {activeSection === "inquiry" && (
          <Descriptions column={1} size="small" title="Inquiry">
            <Descriptions.Item label="Company">{lead.companyName ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Inquiry Category">{lead.inquiryCategory ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Inquiry Source">{effectiveInquirySource(lead) ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Capture Channel">{lead.captureChannel ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="UTM / Campaign Tags">{lead.utmTags ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Expected Value">{formatCompactCurrency(lead.expectedValue)}</Descriptions.Item>
            <Descriptions.Item label="Received On">{formatDate(lead.receivedAt)}</Descriptions.Item>
            <Descriptions.Item label="Internal Notes">{lead.internalNotes ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="RM Remark">{lead.rmRemark ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="LG Remark">{lead.lgRemark ?? "-"}</Descriptions.Item>
          </Descriptions>
        )}
        {activeSection === "store" && (
          <Descriptions column={1} size="small" title="Store information">
            <Descriptions.Item label="Store Location">{yesNo(lead.hasStoreLocation)}</Descriptions.Item>
            <Descriptions.Item label="Store Name">{lead.storeName ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Store Address">{lead.storeAddress ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Store City / State">
              {[lead.storeCity, lead.storeState].filter(Boolean).join(", ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Store Pincode">{lead.storePincode ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Carpet Area">{lead.carpetArea !== null ? `${lead.carpetArea} sq ft` : "-"}</Descriptions.Item>
            <Descriptions.Item label="Frontage">{lead.frontage !== null ? `${lead.frontage} ft` : "-"}</Descriptions.Item>
            <Descriptions.Item label="Ownership">{lead.ownership ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Investment Capacity">
              {formatCompactCurrency(lead.investmentCapacity)}
            </Descriptions.Item>
            <Descriptions.Item label="Existing Business">{lead.existingBusiness ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Expected Opening">{formatDate(lead.expectedOpening)}</Descriptions.Item>
            <Descriptions.Item label="GST Number">{lead.gstNumber ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="PAN">{lead.panNumber ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Drug Licence">{lead.drugLicenceNumber ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="FSSAI Number">{lead.fssaiNumber ?? "-"}</Descriptions.Item>
          </Descriptions>
        )}
        {activeSection === "consent" && consentLoaded && <ConsentTab leadId={lead.id} consent={consent} />}
      </Col>
    </Row>
    </div>
  );
}
