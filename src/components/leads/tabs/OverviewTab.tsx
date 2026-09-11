import { useMemo, useState } from "react";
import { Col, Descriptions, Progress, Row, Typography } from "antd";
import type { Lead } from "../../../types/lead";
import { formatCompactCurrency, formatDate } from "../../../utils/lead-format";

const { Text } = Typography;

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
    "salesTeamId",
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
    "stateId",
    "districtId",
  ],
  inquiry: [
    "companyName",
    "source",
    "inquiryCategory",
    "inquirySource",
    "captureChannel",
    "utmTags",
    "campaignId",
    "expectedValue",
    "receivedAt",
    "internalNotes",
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
};

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

  const sectionProgress = useMemo(
    () =>
      Object.entries(SECTION_FIELDS).map(([key, fields]) => ({
        key,
        label: SECTION_LABELS[key],
        filled: countFilled(lead, fields),
        total: fields.length,
      })),
    [lead]
  );

  return (
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>
          Synopsis
        </Text>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
          {sectionProgress.map((section) => (
            <div
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              style={{
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: 6,
                background: activeSection === section.key ? "#e6f4ff" : "transparent",
                borderLeft: activeSection === section.key ? "3px solid #1677ff" : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text strong={activeSection === section.key}>{section.label}</Text>
                <Text type="secondary">
                  {section.filled}/{section.total}
                </Text>
              </div>
              <Progress
                percent={(section.filled / section.total) * 100}
                showInfo={false}
                size="small"
                strokeColor={section.filled === section.total ? "#0ca30c" : "#1677ff"}
              />
            </div>
          ))}
        </div>
      </Col>
      <Col xs={24} md={16} style={{ marginTop: 16 }}>
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
      </Col>
    </Row>
  );
}
