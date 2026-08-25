import { z } from "zod";

import { LEGAL_VERSIONS } from "@/lib/legal/versions";

export const MINIMUM_AGE = 20;

export const legalGateInputSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acceptedTermsVersion: z.string().min(1),
});

export type LegalGateInput = z.infer<typeof legalGateInputSchema>;

/** Whole years of age on `now` (UTC calendar). Handles leap days. */
export function calculateAge(dob: Date, now: Date): number {
  const y = dob.getUTCFullYear();
  const mo = dob.getUTCMonth();
  const d = dob.getUTCDate();
  const asOf = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  let age = asOf.getUTCFullYear() - y;
  const hadBirthday =
    asOf.getUTCMonth() > mo ||
    (asOf.getUTCMonth() === mo && asOf.getUTCDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export function parseIsoDateOnly(value: string): Date | null {
  const parsed = legalGateInputSchema.shape.dateOfBirth.safeParse(value);
  if (!parsed.success) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parsed.data);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const born = new Date(Date.UTC(y, mo - 1, day));
  if (
    born.getUTCFullYear() !== y ||
    born.getUTCMonth() !== mo - 1 ||
    born.getUTCDate() !== day
  ) {
    return null;
  }
  return born;
}

export type LegalGateAccepted = {
  ok: true;
  dateOfBirth: string;
  termsVersion: string;
  verifiedAt: Date;
};

export type LegalGateRejected =
  | { ok: false; reason: "validation_error" }
  | { ok: false; reason: "age_requirement_not_met" }
  | {
      ok: false;
      reason: "terms_version_stale";
      currentVersion: string;
    };

export function evaluateLegalGate(
  input: unknown,
  now: Date = new Date(),
): LegalGateAccepted | LegalGateRejected {
  const parsed = legalGateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "validation_error" };
  }

  const dob = parseIsoDateOnly(parsed.data.dateOfBirth);
  if (!dob) {
    return { ok: false, reason: "validation_error" };
  }

  const age = calculateAge(dob, now);
  if (age < MINIMUM_AGE) {
    return { ok: false, reason: "age_requirement_not_met" };
  }

  if (parsed.data.acceptedTermsVersion !== LEGAL_VERSIONS.terms) {
    return {
      ok: false,
      reason: "terms_version_stale",
      currentVersion: LEGAL_VERSIONS.terms,
    };
  }

  return {
    ok: true,
    dateOfBirth: parsed.data.dateOfBirth,
    termsVersion: parsed.data.acceptedTermsVersion,
    verifiedAt: now,
  };
}

export const AGE_VERIFICATION_METHOD = "self_declared_dob" as const;

export function legalGateStripeMetadata(
  accepted: LegalGateAccepted,
): Record<string, string> {
  return {
    age_verified_dob: accepted.dateOfBirth,
    age_verification_method: AGE_VERIFICATION_METHOD,
    purchase_terms_version: accepted.termsVersion,
  };
}

export function legalSnapshotFromStripeMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
  verifiedAt: Date = new Date(),
): {
  age_verified_at: string;
  age_verified_dob: string;
  age_verification_method: string;
  terms_version: string;
  terms_accepted_at: string;
} | null {
  const dob = metadata?.age_verified_dob?.trim();
  const method = metadata?.age_verification_method?.trim();
  const terms = metadata?.purchase_terms_version?.trim();
  if (!dob || !method || !terms) return null;
  if (method !== AGE_VERIFICATION_METHOD) return null;
  if (terms !== LEGAL_VERSIONS.terms) return null;
  if (!parseIsoDateOnly(dob)) return null;

  const at = verifiedAt.toISOString();
  return {
    age_verified_at: at,
    age_verified_dob: dob,
    age_verification_method: method,
    terms_version: terms,
    terms_accepted_at: at,
  };
}
