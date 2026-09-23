import { useEffect, useMemo, useState } from "react";
import { Col, Descriptions, Progress, Row, Typography, message } from "antd";
import type { Lead, LeadConsent } from "../../../types/lead";
import * as leadApi from "../../../api/lead-api";
import { formatCompactCurrency, formatDate } from "../../../utils/lead-format";
import { appTokens } from "../../../utils/design-system";
import { ConsentTab } from "./ConsentTab";

const { Text } = Typography;

// Every field listed here must also appear as a rendered Descriptions.Item
// below for the same section, and vice versa - this is the Decision-1 fix:
// the synopsis fill-count and the actual displayed fields must always
// represent the same underlying data. Fields with no real display value on
// the Lead type (e.g. salesTeamId/stateId/districtId/campaignId have no
// denormalized name to show) are intentionally left out of both the count
// and the render, rather than counted but silently never shown.
const SECTION_FIELDS: Record<string, (keyof Lead)[]> = {
  customer: [
    "fullName",
    "contactName",
    "profession",
    "startDate",
    "qualifiedPerson",
    "financialStatus",
    "welcomeMessageSent",
    "status",
    "prospectStatus",
    "category",
    "ownerId",
  ],
  contact: [
    "phone",
    "altPhone",
    "email",
    "website",
    "preferredLanguage",
    "pincode",
    "addressLine1",
    "addressLine2",
    "territory",
  ],
  inquiry: [
    "companyName",
    "source",
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

function countFilled(lead: Lead, fields: (keyof Lead)[]): number {
  return fields.filter((field) => {
    const value = lead[field];
    return value !== null && value !== undefined && value !== "";
  }).length;
}

function yesNo(value: boolean | null): string {
  if (value === null) return "-";
  return value ? "Yes" : "No";
}

interface OverviewTabProps {
  lead: Lead;
}

export function OverviewTab({ lead }: OverviewTabProps) {
  const [activeSection, setActiveSection] = useState<string>("customer");
  const [consent, setConsent] = useState<LeadConsent | null>(null);
  const [consentLoaded, setConsentLoaded] = useState(false);

  // Fetched once here (not inside ConsentTab) so the synopsis count and the
  // Consent section itself share the same data - see ConsentTab's `consent`
  // prop, which skips its own fetch when given this.
  useEffect(() => {
    leadApi
      .getLeadConsent(lead.id)
      .then(setConsent)
      .catch(() => message.error("Failed to load consent"))
      .finally(() => setConsentLoaded(true));
  }, [lead.id]);

  const sectionProgress = useMemo(() => {
    const fromLead = Object.entries(SECTION_FIELDS).map(([key, fields]) => ({
      key,
      label: SECTION_LABELS[key],
      filled: countFilled(lead, fields),
      total: fields.length,
    }));
    return [
      ...fromLead,
      { key: "consent", label: SECTION_LABELS.consent, filled: countConsentFilled(consent), total: CONSENT_FIELD_COUNT },
    ];
  }, [lead, consent]);

  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <div
          style={{
            border: `1px solid ${appTokens.border}`,
            borderRadius: appTokens.radius,
            padding: 16,
            background: appTokens.surface,
            boxShadow: appTokens.shadowXs,
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
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text strong={activeSection === section.key} style={{ color: appTokens.textPrimary, fontSize: 13.5 }}>
                  {section.label}
                </Text>
                <Text style={{ color: appTokens.textTertiary, fontSize: 12.5 }}>
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
        </div>
      </Col>
      <Col xs={24} md={16} style={{ marginTop: 16, borderRadius: appTokens.radius, overflow: "hidden", boxShadow: appTokens.shadowXs }}>
        {activeSection === "customer" && (
          <Descriptions column={1} size="small" title="Customer" bordered>
            <Descriptions.Item label="Full Name">{lead.fullName}</Descriptions.Item>
            <Descriptions.Item label="Contact Name">{lead.contactName ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Profession">{lead.profession ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Start Date">{formatDate(lead.startDate)}</Descriptions.Item>
            <Descriptions.Item label="Qualified Person">{lead.qualifiedPerson ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Financial Status">{lead.financialStatus ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Welcome Message Sent">{yesNo(lead.welcomeMessageSent)}</Descriptions.Item>
            <Descriptions.Item label="Status">{lead.status}</Descriptions.Item>
            <Descriptions.Item label="Prospect Status">{lead.prospectStatus ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Category">{lead.category ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Salesperson">{lead.ownerName ?? "Unassigned"}</Descriptions.Item>
          </Descriptions>
        )}
        {activeSection === "contact" && (
          <Descriptions column={1} size="small" title="Contact & address" bordered>
            <Descriptions.Item label="Phone">{lead.phone ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Alternative Mobile">{lead.altPhone ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Email">{lead.email ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Website">{lead.website ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Preferred Language">{lead.preferredLanguage ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="PinCode">{lead.pincode ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Address">
              {[lead.addressLine1, lead.addressLine2].filter(Boolean).join(", ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Territory">{lead.territory ?? "-"}</Descriptions.Item>
          </Descriptions>
        )}
        {activeSection === "inquiry" && (
          <Descriptions column={1} size="small" title="Inquiry" bordered>
            <Descriptions.Item label="Company">{lead.companyName ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Source">{lead.source ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Inquiry Category">{lead.inquiryCategory ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Inquiry Source">{lead.inquirySource ?? "-"}</Descriptions.Item>
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
          <Descriptions column={1} size="small" title="Store information" bordered>
            <Descriptions.Item label="Store Location">{yesNo(lead.hasStoreLocation)}</Descriptions.Item>
            <Descriptions.Item label="Store Name">{lead.storeName ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Store Address">{lead.storeAddress ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Store City / State">
              {[lead.storeCity, lead.storeState].filter(Boolean).join(", ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Store Pincode">{lead.storePincode ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Carpet Area">{lead.carpetArea ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Frontage">{lead.frontage ?? "-"}</Descriptions.Item>
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
  );
}
