/**
 * Marketing consent for "new pallets opening" emails only.
 * No send path — storage + recipient selection + unsubscribe helpers.
 */

export const NEW_PALLET_OPEN_PURPOSE = "new_pallet_open" as const;

/** Stable id for the exact SV/EN checkbox copy (bump when legal text changes). */
export const NEW_PALLET_OPEN_CONSENT_TEXT_VERSION =
  "new_pallet_open_v1_2026-11-09" as const;

export type NewPalletOpenConsentPurpose = typeof NEW_PALLET_OPEN_PURPOSE;

export type MarketingConsentRow = {
  id: string;
  user_id: string | null;
  email: string;
  purpose: string;
  text_version_id: string;
  consented_at: string;
  withdrawn_at: string | null;
  unsubscribe_token: string;
};

/** Minimum age for marketing recipients (stored DOB). */
export const MARKETING_MIN_AGE_YEARS = 25;

export function meetsMarketingAge(
  dateOfBirth: string | null | undefined,
  at: Date = new Date(),
  minAge: number = MARKETING_MIN_AGE_YEARS,
): boolean {
  const raw = typeof dateOfBirth === "string" ? dateOfBirth.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return false;
  const dob = new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date(at);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - minAge);
  return dob.getTime() <= cutoff.getTime();
}

/**
 * Filter active consent rows to eligible mailing recipients.
 * Excludes withdrawn and anyone under 25 by profile DOB map.
 */
export function selectNewPalletOpenRecipients(args: {
  consents: MarketingConsentRow[];
  /** email (lower) → ISO date_of_birth YYYY-MM-DD */
  birthDateByEmail: Record<string, string | null | undefined>;
  at?: Date;
}): Array<{
  email: string;
  user_id: string | null;
  unsubscribe_token: string;
  text_version_id: string;
}> {
  const at = args.at ?? new Date();
  const out: Array<{
    email: string;
    user_id: string | null;
    unsubscribe_token: string;
    text_version_id: string;
  }> = [];
  const seen = new Set<string>();

  for (const row of args.consents) {
    if (row.purpose !== NEW_PALLET_OPEN_PURPOSE) continue;
    if (row.withdrawn_at) continue;
    const email = String(row.email || "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) continue;
    if (seen.has(email)) continue;
    const dob = args.birthDateByEmail[email];
    if (!meetsMarketingAge(dob ?? null, at)) continue;
    seen.add(email);
    out.push({
      email,
      user_id: row.user_id,
      unsubscribe_token: row.unsubscribe_token,
      text_version_id: row.text_version_id,
    });
  }
  return out;
}

export function createUnsubscribeToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}
