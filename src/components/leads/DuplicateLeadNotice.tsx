import { Link } from "react-router-dom";
import { Typography } from "antd";
import type { DuplicateLeadMatch } from "../../api/lead-api";

const { Text } = Typography;

function describe(match: DuplicateLeadMatch): string {
  const label = match.leadNumber ? `Lead #${match.leadNumber} - ${match.fullName}` : match.fullName;
  return `${label} (${match.status}, ${match.ownerName ? `with ${match.ownerName}` : "unassigned"})`;
}

// Shown under the Phone / Email field of the lead forms when another active
// lead already has that value. "phone" blocks saving; "email" is a heads-up.
// The link opens the existing lead in a new tab so the half-filled form isn't
// lost.
export function DuplicateLeadNotice({ match, kind }: { match: DuplicateLeadMatch; kind: "phone" | "email" }) {
  const open = (
    <Link to={`/leads?leadId=${match.id}`} target="_blank" rel="noopener">
      Open that lead
    </Link>
  );
  return kind === "phone" ? (
    <Text type="danger" style={{ fontSize: 12 }}>
      This mobile number already belongs to {describe(match)}. {open} instead of creating a new one.
    </Text>
  ) : (
    <Text type="warning" style={{ fontSize: 12 }}>
      {describe(match)} already uses this email - check it isn't the same person. {open}
    </Text>
  );
}
