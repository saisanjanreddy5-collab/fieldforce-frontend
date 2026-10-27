export interface ImportMappableField {
  key: string;
  label: string;
  required?: boolean;
}

// A realistic core subset of createLeadSchema's ~50 fields, not every one -
// the ones an actual bulk lead-capture spreadsheet would plausibly carry.
// Anything else stays settable the normal way (editing the lead after
// import) rather than bloating this screen.
export const IMPORT_MAPPABLE_FIELDS: ImportMappableField[] = [
  { key: "fullName", label: "Full name", required: true },
  { key: "contactName", label: "Contact name" },
  { key: "phone", label: "Phone" },
  { key: "altPhone", label: "Alternate phone" },
  { key: "email", label: "Email" },
  { key: "companyName", label: "Company name" },
  { key: "category", label: "Category" },
  // Required so the Call Center -> Field Sales pincode-matching engine
  // (lead-call-center-service.ts) has something to match against - without
  // it, a marketing lead can reach Qualified but can never actually be sent
  // to a field employee.
  { key: "pincode", label: "Pincode", required: true },
  { key: "territory", label: "Territory" },
  { key: "source", label: "Source" },
  { key: "expectedValue", label: "Expected value" },
  { key: "website", label: "Website" },
  { key: "internalNotes", label: "Internal notes" },
  // Optional - matched against an active Call Center employee's email or
  // employee code at import time (see resolveCallCenterExecutiveByIdentifier
  // in lead-service.ts). A row with a value that doesn't resolve is reported
  // as skipped rather than guessed at, so leave this unmapped entirely for a
  // normal round-robin-into-FLC import.
  { key: "assigneeIdentifier", label: "Call Center Executive (email or employee code)" },
];

// Exact-match only (on a normalized header), not fuzzy substring matching -
// a wrong auto-guess that silently imports phone numbers into the email
// column is worse than leaving a field unmapped for the person to pick by
// hand.
const FIELD_ALIASES: Record<string, string[]> = {
  fullName: ["fullname", "name", "leadname", "customername"],
  contactName: ["contactname", "contactperson", "contact"],
  phone: ["phone", "mobile", "phonenumber", "mobilenumber", "contactnumber"],
  altPhone: ["altphone", "alternatephone", "secondaryphone", "altmobile", "alternatemobile"],
  email: ["email", "emailaddress", "mail"],
  companyName: ["companyname", "company", "business", "businessname", "firm", "firmname"],
  category: ["category", "leadcategory", "type"],
  pincode: ["pincode", "pin", "zip", "zipcode", "postalcode"],
  territory: ["territory", "area", "region"],
  source: ["source", "leadsource"],
  expectedValue: ["expectedvalue", "value", "dealvalue", "amount"],
  website: ["website", "url"],
  internalNotes: ["notes", "internalnotes", "remarks", "comment", "comments"],
  // "executive" alone used to be in this list and was the real cause of a
  // live mis-import: a sheet's plain "Executive" column (the person's NAME,
  // not their email/code - the two are easy to conflate when filling a
  // sheet by hand) auto-matched here, silently feeding names into a field
  // that can only ever match an email or employee code, and every row got
  // reported as "not found". Every alias left here is specific enough that
  // it's very unlikely to label a bare-name column instead.
  assigneeIdentifier: ["callcenterexecutive", "executiveemail", "employeecode", "assignedto", "agent", "owner"],
};

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type ColumnMapping = Record<string, string>; // field key -> uploaded header name

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalize(h) }));

  for (const field of IMPORT_MAPPABLE_FIELDS) {
    // A field's own label counts as one of its aliases - without this, our
    // own downloadable template (handleDownloadTemplate in
    // ImportLeadsModal.tsx, which writes f.label as the column header)
    // didn't round-trip for any field whose label isn't already a literal
    // alias. assigneeIdentifier was the one real casualty: its label, "Call
    // Center Executive (email or employee code)", normalizes to
    // "callcenterexecutiveemailoremployeecode", which matched none of its
    // own aliases - so the template this app generates for people to fill
    // in didn't even auto-map itself back. Every other field happened to
    // have a short label that was already also listed as its own alias
    // (e.g. "Email" -> "email"), which is why only this one field broke.
    const aliases = [...(FIELD_ALIASES[field.key] ?? []), normalize(field.label)];
    const match = normalizedHeaders.find((h) => aliases.includes(h.normalized));
    if (match) mapping[field.key] = match.original;
  }
  return mapping;
}

const STORAGE_KEY = "fieldforce.leadImport.columnMapping";

export function loadSavedMapping(): ColumnMapping {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ColumnMapping) : {};
  } catch {
    return {};
  }
}

export function saveMapping(mapping: ColumnMapping): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  } catch {
    // Best-effort - a blocked/full localStorage just means next time starts
    // from a fresh auto-guess instead of the remembered mapping.
  }
}

// Builds the initial mapping for a freshly uploaded file: prefer the
// remembered mapping from last time (only for fields whose saved header
// name still exists in this file), fall back to auto-guessing the rest.
export function resolveInitialMapping(headers: string[]): ColumnMapping {
  const saved = loadSavedMapping();
  const guessed = guessColumnMapping(headers);
  const resolved: ColumnMapping = {};
  for (const field of IMPORT_MAPPABLE_FIELDS) {
    const savedHeader = saved[field.key];
    if (savedHeader && headers.includes(savedHeader)) {
      resolved[field.key] = savedHeader;
    } else if (guessed[field.key]) {
      resolved[field.key] = guessed[field.key];
    }
  }
  return resolved;
}
