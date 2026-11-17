// A real email address like "name@gmail.co" is syntactically valid (.co is
// a real top-level domain) - no format check can or should reject it. This
// is a separate, deliberately narrow nudge: a hardcoded list of genuinely
// common typos of major providers, not a fuzzy edit-distance match - that
// would risk flagging a real, less-common domain as "probably a mistake".
const KNOWN_DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "yahoo.co": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "hotmial.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "rediffmail.co": "rediffmail.com",
};

// Returns the likely-intended full email address, or null when the typed
// address doesn't match any known typo (including when it's already right).
export function suggestEmailDomainFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;

  const domain = email.slice(at + 1).trim().toLowerCase();
  const fixedDomain = KNOWN_DOMAIN_TYPOS[domain];
  if (!fixedDomain) return null;

  return `${email.slice(0, at + 1)}${fixedDomain}`;
}

// One rule set for every lead/customer email field in the app, so they can
// never drift apart again:
//  - normalizeEmail: trimmed and lowercased as the user types. Email
//    addresses are case-insensitive in practice ("Name@Gmail.COM" reaches the
//    same inbox as "name@gmail.com"), so - like Zoho/Salesforce/HubSpot - we
//    normalise instead of rejecting, and what's on screen is exactly what's
//    saved.
//  - EMAIL_FORMAT: a real "name@domain.tld" shape. ANY real domain/TLD is
//    allowed (.com, .in, .org, .co.in, ...) - plenty of genuine Indian
//    business addresses aren't .com.
//  - the known-typo check above (gmial.com, gmail.co, ...) still blocks the
//    common provider typos.
export const EMAIL_FORMAT = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;

export function normalizeEmail(value: string | undefined): string | undefined {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

export const emailRules = [
  { pattern: EMAIL_FORMAT, message: "Enter a valid email address, e.g. name@company.com" },
  {
    validator: (_: unknown, value: string | undefined) => {
      const suggestion = value ? suggestEmailDomainFix(value) : null;
      if (!suggestion) return Promise.resolve();
      return Promise.reject(new Error("Possible email typo - see suggestion below"));
    },
  },
];
