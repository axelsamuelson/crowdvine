/**
 * Juliette (2026-11-20): never persist date of birth in browser storage.
 * Scrub any legacy DOB fields from checkout drafts on visit without touching
 * email / name / phone / address. Age must be entered each visit unless the
 * account already has a server-side date_of_birth (profile prefill).
 */

export const CHECKOUT_LOCAL_DRAFT_STORAGE_KEYS = [
  "pact_checkout_draft",
  "pact-checkout-draft",
  "checkout_draft",
  "checkout-draft",
  "cv_checkout_draft",
  "cv-checkout-draft",
] as const;

/** Field names that must never remain in local/session storage. */
export const CHECKOUT_DOB_FIELD_KEYS = [
  "date_of_birth",
  "dateOfBirth",
  "dob",
  "birth_date",
  "birthDate",
  "födelseDatum",
  "fodelsedatum",
] as const;

const DOB_KEY_SET = new Set<string>(
  CHECKOUT_DOB_FIELD_KEYS.map((k) => k.toLowerCase()),
);

function isDobFieldName(key: string): boolean {
  const k = key.trim().toLowerCase();
  if (DOB_KEY_SET.has(k)) return true;
  // Standalone keys like "checkout_date_of_birth"
  return (
    k.includes("date_of_birth") ||
    k.includes("dateofbirth") ||
    /(^|[._-])dob($|[._-])/.test(k) ||
    k.includes("fodelsedatum") ||
    k.includes("födelsedatum")
  );
}

/**
 * Remove DOB fields from a parsed draft object. Other fields unchanged.
 * Returns whether anything was removed.
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

function scrubOneStorage(storage: StorageLike | null | undefined): {
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

  for (const key of keys) {
    try {
      // Standalone DOB keys (legacy) — delete entirely.
      if (isDobFieldName(key)) {
        storage.removeItem(key);
        keysTouched.push(key);
        fieldsRemoved += 1;
        continue;
      }

      const raw = storage.getItem(key);
      if (raw == null || raw === "") continue;
      // Only rewrite JSON objects that look like drafts / form blobs.
      const trimmed = raw.trim();
      if (!trimmed.startsWith("{")) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }
      const { next, removed } = stripDobFieldsFromDraft(parsed);
      if (!removed) continue;
      // Count removed top-level + nested DOB keys approximately.
      fieldsRemoved += 1;
      keysTouched.push(key);
      storage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage may be unavailable / quota — ignore.
    }
  }

  // Known draft keys: ensure present even if empty/non-JSON previously.
  for (const draftKey of CHECKOUT_LOCAL_DRAFT_STORAGE_KEYS) {
    if (keysTouched.includes(draftKey)) continue;
    try {
      const raw = storage.getItem(draftKey);
      if (raw == null) continue;
      const trimmed = raw.trim();
      if (!trimmed.startsWith("{")) continue;
      const parsed = JSON.parse(trimmed) as unknown;
      const { next, removed } = stripDobFieldsFromDraft(parsed);
      if (removed) {
        storage.setItem(draftKey, JSON.stringify(next));
        keysTouched.push(draftKey);
        fieldsRemoved += 1;
      }
    } catch {
      // ignore
    }
  }

  return { keysTouched, fieldsRemoved };
}

/**
 * Scrub DOB from localStorage + sessionStorage. Safe to call on every
 * checkout visit. Does not clear cookies or touch non-DOB draft fields.
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
  const b = scrubOneStorage(storages.sessionStorage ?? null);
  return {
    keysTouched: [...a.keysTouched, ...b.keysTouched],
    fieldsRemoved: a.fieldsRemoved + b.fieldsRemoved,
  };
}

/** True when a draft payload still contains a DOB field (for tests). */
export function draftContainsDobField(value: unknown): boolean {
  if (value == null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (isDobFieldName(key)) return true;
    if (draftContainsDobField(v)) return true;
  }
  return false;
}
