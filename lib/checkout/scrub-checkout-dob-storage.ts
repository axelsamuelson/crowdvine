/**
 * Never persist date of birth in localStorage or legacy blobs (Juliette / Camille).
 * On every checkout visit: delete standalone DOB keys and strip DOB fields from
 * legacy checkout/form JSON blobs — without clearing email/name/phone/address.
 *
 * Exception: sessionStorage `pact_checkout_postal_draft` may keep an ISO
 * dateOfBirth for same-tab F5 restore (cleared when the order is placed).
 * Server profile.date_of_birth may still prefill for signed-in accounts.
 */

/** Known checkout draft / form blob keys (current + pre-PR289 / speculative). */
export const CHECKOUT_LOCAL_DRAFT_STORAGE_KEYS = [
  "pact_checkout_draft",
  "pact_checkout_postal_draft",
  "pact-checkout-draft",
  "checkout_draft",
  "checkout-draft",
  "cv_checkout_draft",
  "cv-checkout-draft",
  // Legacy session blobs (removed from app ~086c6460; may still sit in browsers)
  "checkoutFormData",
  "checkoutZoneInfo",
  "checkoutForm",
  "checkout_form",
  "checkout_form_draft",
  "formDraft",
  "pact_checkout_form",
  "pact-checkout-form",
  "pact_checkout",
  "pact-checkout",
  "cv_checkout_form",
  "cv-checkout-form",
  "guest_checkout_draft",
  "guest-checkout-draft",
  "delivery_draft",
  "deliveryDraft",
] as const;

/** Standalone keys that must be deleted entirely if present. */
export const CHECKOUT_DOB_STANDALONE_KEYS = [
  "date_of_birth",
  "dateOfBirth",
  "dob",
  "birth_date",
  "birthDate",
  "födelseDatum",
  "fodelsedatum",
  "födelsedatum",
  "checkout_date_of_birth",
  "checkout_dateOfBirth",
  "checkout_dob",
  "checkout-dob",
  "age_dob",
  "age-dob",
  "ageDob",
  "age_date_of_birth",
  "pact_dob",
  "pact_date_of_birth",
  "pact-date-of-birth",
  "cv_dob",
  "cv_date_of_birth",
] as const;

/** Field names stripped from inside JSON objects. */
export const CHECKOUT_DOB_FIELD_KEYS = [
  "date_of_birth",
  "dateOfBirth",
  "dob",
  "birth_date",
  "birthDate",
  "birth_year",
  "birthYear",
  "födelseDatum",
  "fodelsedatum",
  "födelsedatum",
  "age_dob",
  "ageDob",
  "ageDate",
  "age_date",
] as const;

const DOB_FIELD_SET = new Set<string>(
  CHECKOUT_DOB_FIELD_KEYS.map((k) => k.toLowerCase()),
);

const DOB_STANDALONE_SET = new Set<string>(
  CHECKOUT_DOB_STANDALONE_KEYS.map((k) => k.toLowerCase()),
);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

/** True when a storage / JSON field name looks like a DOB carrier. */
export function isDobFieldName(key: string): boolean {
  const k = normalizeKey(key);
  if (DOB_FIELD_SET.has(k) || DOB_STANDALONE_SET.has(k)) return true;
  return (
    k.includes("date_of_birth") ||
    k.includes("dateofbirth") ||
    k.includes("date-of-birth") ||
    /(^|[._-])dob($|[._-])/.test(k) ||
    k.includes("fodelsedatum") ||
    k.includes("födelsedatum") ||
    k.includes("birthdate") ||
    k.includes("birth_date") ||
    k.includes("birth-date") ||
    (k.includes("födelse") && !k.includes("policy")) ||
    (k.includes("fodelse") && !k.includes("policy"))
  );
}

function isIsoDateOnly(value: unknown): boolean {
  return typeof value === "string" && ISO_DATE_RE.test(value.trim());
}

/**
 * Remove DOB fields from a parsed draft object. Other fields unchanged.
 */
export function stripDobFieldsFromDraft(
  value: unknown,
): { next: unknown; removed: boolean } {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { next: value, removed: false };
  }
  const obj = value as Record<string, unknown>;
  let removed = false;
  const next: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(obj)) {
    if (isDobFieldName(key)) {
      removed = true;
      continue;
    }
    // Nested form bags
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      const nested = stripDobFieldsFromDraft(v);
      next[key] = nested.next;
      if (nested.removed) removed = true;
    } else {
      next[key] = v;
    }
  }
  return { next, removed };
}

type StorageLike = {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function scrubOneStorage(
  storage: StorageLike | null | undefined,
  opts?: { allowSessionPostalDraftDob?: boolean },
): {
  keysTouched: string[];
  fieldsRemoved: number;
} {
  const keysTouched: string[] = [];
  let fieldsRemoved = 0;
  if (!storage) return { keysTouched, fieldsRemoved };

  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k) keys.push(k);
    }
  } catch {
    return { keysTouched, fieldsRemoved };
  }

  // Always try known draft keys even if length enumeration missed them.
  for (const draftKey of CHECKOUT_LOCAL_DRAFT_STORAGE_KEYS) {
    if (!keys.includes(draftKey)) keys.push(draftKey);
  }
  for (const standalone of CHECKOUT_DOB_STANDALONE_KEYS) {
    if (!keys.includes(standalone)) keys.push(standalone);
  }

  for (const key of keys) {
    try {
      const raw = storage.getItem(key);
      if (raw == null) continue;

      // Intentional same-tab age restore — leave session postal draft alone.
      if (
        opts?.allowSessionPostalDraftDob &&
        key === "pact_checkout_postal_draft"
      ) {
        continue;
      }

      // Standalone DOB key names — delete entirely.
      if (isDobFieldName(key)) {
        storage.removeItem(key);
        keysTouched.push(key);
        fieldsRemoved += 1;
        continue;
      }

      const trimmed = raw.trim();

      // Plain ISO date stored under a checkout/form-ish key (legacy mistake).
      if (
        isIsoDateOnly(trimmed) &&
        /checkout|form|guest|delivery|address|age|pact|cv[_-]/i.test(key)
      ) {
        storage.removeItem(key);
        keysTouched.push(key);
        fieldsRemoved += 1;
        continue;
      }

      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (Array.isArray(parsed)) {
        // Rare: array of form steps — strip each object.
        let anyRemoved = false;
        const nextArr = parsed.map((item) => {
          const { next, removed } = stripDobFieldsFromDraft(item);
          if (removed) anyRemoved = true;
          return next;
        });
        if (anyRemoved) {
          storage.setItem(key, JSON.stringify(nextArr));
          keysTouched.push(key);
          fieldsRemoved += 1;
        }
        continue;
      }

      const { next, removed } = stripDobFieldsFromDraft(parsed);
      if (!removed) continue;
      fieldsRemoved += 1;
      keysTouched.push(key);
      storage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage may be unavailable / quota — ignore.
    }
  }

  return { keysTouched, fieldsRemoved };
}

/**
 * Scrub DOB from localStorage + sessionStorage. Safe on every checkout visit.
 * Preserves sessionStorage postal-draft dateOfBirth for F5 restore.
 */
export function scrubCheckoutDobFromBrowserStorage(
  storages: {
    localStorage?: StorageLike | null;
    sessionStorage?: StorageLike | null;
  } = typeof window !== "undefined"
    ? {
        localStorage: window.localStorage,
        sessionStorage: window.sessionStorage,
      }
    : {},
): { keysTouched: string[]; fieldsRemoved: number } {
  const a = scrubOneStorage(storages.localStorage ?? null);
  const b = scrubOneStorage(storages.sessionStorage ?? null, {
    allowSessionPostalDraftDob: true,
  });
  return {
    keysTouched: [...a.keysTouched, ...b.keysTouched],
    fieldsRemoved: a.fieldsRemoved + b.fieldsRemoved,
  };
}

/** True when a draft payload still contains a DOB field (for tests). */
export function draftContainsDobField(value: unknown): boolean {
  if (value == null || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => draftContainsDobField(item));
  }
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (isDobFieldName(key)) return true;
    if (draftContainsDobField(v)) return true;
  }
  return false;
}
