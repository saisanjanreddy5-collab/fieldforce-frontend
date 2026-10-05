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
  { key: "territory", label: "Territory" },
  { key: "source", label: "Source" },
  { key: "expectedValue", label: "Expected value" },
  { key: "website", label: "Website" },
  { key: "internalNotes", label: "Internal notes" },
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
  territory: ["territory", "area", "region"],
  source: ["source", "leadsource"],
  expectedValue: ["expectedvalue", "value", "dealvalue", "amount"],
  website: ["website", "url"],
  internalNotes: ["notes", "internalnotes", "remarks", "comment", "comments"],
};

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type ColumnMapping = Record<string, string>; // field key -> uploaded header name

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalize(h) }));

  for (const field of IMPORT_MAPPABLE_FIELDS) {
    const aliases = FIELD_ALIASES[field.key] ?? [];
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
