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
