import { createHash, randomBytes } from "node:crypto";
import { getAppUrl } from "@/lib/app-url";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const TOKEN_BYTES = 32;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function mintRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function buildReservationExtensionConfirmPath(rawToken: string): string {
  return `/reservation-extension/confirm?token=${encodeURIComponent(rawToken)}`;
}

export function buildReservationExtensionConfirmUrl(
  origin: string,
  rawToken: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildReservationExtensionConfirmPath(rawToken)}`;
}

export async function createReservationExtensionToken(opts: {
  reservationId: string;
  expiresAt: Date;
  origin?: string;
}): Promise<{ rawToken: string; url: string; expiresAt: string }> {
  const rawToken = mintRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = opts.expiresAt.toISOString();
  const sb = getSupabaseAdmin();

  const { error } = await sb.from("reservation_extension_tokens").insert({
    reservation_id: opts.reservationId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(
      `Failed to create extension token: ${error.message}`,
    );
  }

  const origin = (opts.origin?.trim() || getAppUrl()).replace(/\/$/, "");
  return {
    rawToken,
    url: buildReservationExtensionConfirmUrl(origin, rawToken),
    expiresAt,
  };
}

export type ConsumeExtensionTokenResult =
  | {
      ok: true;
      reservationId: string;
      tokenId: string;
    }
  | {
      ok: false;
      code:
        | "missing_token"
        | "not_found"
        | "expired"
        | "already_used"
        | "db_error";
      message: string;
    };

/**
 * Validate and consume a single-use extension token.
 * Marks used_at only when still unused and unexpired.
 */
export async function consumeReservationExtensionToken(
  rawToken: string,
  now: Date = new Date(),
): Promise<ConsumeExtensionTokenResult> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, code: "missing_token", message: "Token saknas." };
  }

  const tokenHash = hashToken(token);
  const sb = getSupabaseAdmin();

  const { data: row, error } = await sb
    .from("reservation_extension_tokens")
    .select("id, reservation_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "db_error", message: error.message };
  }
  if (!row) {
    return {
      ok: false,
      code: "not_found",
      message: "Länken är ogiltig.",
    };
  }
  if (row.used_at != null) {
    return {
      ok: false,
      code: "already_used",
      message: "Länken har redan använts.",
    };
  }

  const expiresAt = new Date(String(row.expires_at));
  if (!Number.isFinite(expiresAt.getTime()) || now.getTime() > expiresAt.getTime()) {
    return {
      ok: false,
      code: "expired",
      message: "Länken har gått ut.",
    };
  }

  const usedAt = now.toISOString();
  const { data: updated, error: updErr } = await sb
    .from("reservation_extension_tokens")
    .update({ used_at: usedAt })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id, reservation_id")
    .maybeSingle();

  if (updErr) {
    return { ok: false, code: "db_error", message: updErr.message };
  }
  if (!updated) {
    return {
      ok: false,
      code: "already_used",
      message: "Länken har redan använts.",
    };
  }

  return {
    ok: true,
    reservationId: String(updated.reservation_id),
    tokenId: String(updated.id),
  };
}
