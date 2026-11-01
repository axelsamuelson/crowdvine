import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const TOKEN_BYTES = 32;
/** Guest claim window after submit. */
export const B2B_INQUIRY_CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function mintB2bInquiryClaimToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: string;
} {
  const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + B2B_INQUIRY_CLAIM_TTL_MS).toISOString(),
  };
}

export type ClaimB2bInquiryResult =
  | { ok: true; inquiryId: string }
  | {
      ok: false;
      code:
        | "missing_token"
        | "not_found"
        | "expired"
        | "already_claimed"
        | "db_error";
      message: string;
    };

/**
 * Attach a guest inquiry to the authenticated user via one-time claim token.
 * Clears claim_token_* on success. Idempotent if already owned by the same user.
 */
export async function claimB2bInquiryForUser(opts: {
  rawToken: string;
  userId: string;
  now?: Date;
}): Promise<ClaimB2bInquiryResult> {
  const token = opts.rawToken.trim();
  if (!token) {
    return { ok: false, code: "missing_token", message: "Token saknas." };
  }

  const now = opts.now ?? new Date();
  const tokenHash = hashToken(token);
  const sb = getSupabaseAdmin();

  const { data: row, error } = await sb
    .from("b2b_inquiries")
    .select("id, user_id, claim_token_expires_at")
    .eq("claim_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "db_error", message: error.message };
  }
  if (!row) {
    // Already claimed by this user (token cleared) — treat as success if we
    // can find nothing; caller only has the raw token. Fall through as not_found.
    return {
      ok: false,
      code: "not_found",
      message: "Länken är ogiltig eller har redan använts.",
    };
  }

  if (row.user_id && row.user_id !== opts.userId) {
    return {
      ok: false,
      code: "already_claimed",
      message: "Förfrågan är redan kopplad till ett annat konto.",
    };
  }

  if (row.user_id === opts.userId) {
    await sb
      .from("b2b_inquiries")
      .update({
        claim_token_hash: null,
        claim_token_expires_at: null,
        updated_at: now.toISOString(),
      })
      .eq("id", row.id);
    return { ok: true, inquiryId: String(row.id) };
  }

  const expiresAt = row.claim_token_expires_at
    ? new Date(String(row.claim_token_expires_at))
    : null;
  if (
    !expiresAt ||
    !Number.isFinite(expiresAt.getTime()) ||
    now.getTime() > expiresAt.getTime()
  ) {
    return {
      ok: false,
      code: "expired",
      message: "Länken har gått ut.",
    };
  }

  const { data: updated, error: updErr } = await sb
    .from("b2b_inquiries")
    .update({
      user_id: opts.userId,
      claim_token_hash: null,
      claim_token_expires_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", row.id)
    .is("user_id", null)
    .eq("claim_token_hash", tokenHash)
    .select("id")
    .maybeSingle();

  if (updErr) {
    return { ok: false, code: "db_error", message: updErr.message };
  }
  if (!updated) {
    return {
      ok: false,
      code: "already_claimed",
      message: "Förfrågan kunde inte kopplas. Försök igen.",
    };
  }

  return { ok: true, inquiryId: String(updated.id) };
}
