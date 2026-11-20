import { useEffect, useState } from "react";
import * as leadApi from "../api/lead-api";
import type { DuplicateCheckResult } from "../api/lead-api";

const EMPTY: DuplicateCheckResult = { phone: null, email: null };
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Live "does an active lead already have this number / email?" check for the
// lead forms, as the person types. Mobile matches block saving (the backend
// refuses them too); email matches only warn. A value equal to the lead's own
// saved one (editing) isn't checked - an older duplicate pair must stay
// editable.
export function useLeadDuplicateCheck({
  phone,
  email,
  enabled,
  excludeLeadId,
  savedPhone,
  savedEmail,
}: {
  phone?: string;
  email?: string;
  enabled: boolean;
  excludeLeadId?: string;
  savedPhone?: string | null;
  savedEmail?: string | null;
}): DuplicateCheckResult {
  const [result, setResult] = useState<DuplicateCheckResult>(EMPTY);

  const phoneToCheck = enabled && phone && /^\d{10}$/.test(phone) && phone !== savedPhone ? phone : undefined;
  const cleanEmail = email?.trim().toLowerCase();
  const emailToCheck =
    enabled && cleanEmail && EMAIL_SHAPE.test(cleanEmail) && cleanEmail !== savedEmail?.trim().toLowerCase() ? cleanEmail : undefined;

  useEffect(() => {
    if (!phoneToCheck && !emailToCheck) {
      setResult(EMPTY);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      leadApi
        .checkLeadDuplicates({ phone: phoneToCheck, email: emailToCheck, excludeLeadId })
        .then((r) => !cancelled && setResult(r))
        // A failed check never blocks the form - the backend still refuses
        // a duplicate mobile number on save.
        .catch(() => !cancelled && setResult(EMPTY));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phoneToCheck, emailToCheck, excludeLeadId]);

  return result;
}
