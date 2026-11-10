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

export function buildSoldOutChoicePath(rawToken: string): string {
  return `/pallet-lock-choice?token=${encodeURIComponent(rawToken)}`;
}

export function buildSoldOutChoiceUrl(
  rawToken: string,
  origin?: string,
): string {
  const base = (origin?.trim() || getAppUrl()).replace(/\/$/, "");
  return `${base}${buildSoldOutChoicePath(rawToken)}`;
}

export async function createSoldOutChoiceToken(opts: {
  reservationId: string;
  reservationItemId: string;
  expiresAt: Date;
  origin?: string;
}): Promise<{ rawToken: string; url: string; expiresAt: string }> {
  const rawToken = mintRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = opts.expiresAt.toISOString();
  const sb = getSupabaseAdmin();

  const { error } = await sb.from("pallet_sold_out_choice_tokens").insert({
    reservation_id: opts.reservationId,
    reservation_item_id: opts.reservationItemId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`Failed to create sold-out choice token: ${error.message}`);
  }

  return {
    rawToken,
    url: buildSoldOutChoiceUrl(rawToken, opts.origin),
    expiresAt,
  };
}

export type ConsumeSoldOutTokenResult =
  | {
      ok: true;
      reservationId: string;
      reservationItemId: string;
      tokenId: string;
    }
  | {
      ok: false;
      code: "missing_token" | "not_found" | "expired" | "already_used" | "db_error";
      message: string;
    };

export async function consumeSoldOutChoiceToken(
  rawToken: string,
  now: Date = new Date(),
): Promise<ConsumeSoldOutTokenResult> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, code: "missing_token", message: "Token saknas." };
  }

  const tokenHash = hashToken(token);
  const sb = getSupabaseAdmin();

  const { data: row, error } = await sb
    .from("pallet_sold_out_choice_tokens")
    .select("id, reservation_id, reservation_item_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "db_error", message: error.message };
  }
  if (!row) {
    return { ok: false, code: "not_found", message: "Ogiltig länk." };
  }
  if (row.used_at) {
    return { ok: false, code: "already_used", message: "Länken har redan använts." };
  }
  if (new Date(row.expires_at).getTime() < now.getTime()) {
    return { ok: false, code: "expired", message: "Länken har gått ut." };
  }

  const { error: updErr } = await sb
    .from("pallet_sold_out_choice_tokens")
    .update({ used_at: now.toISOString() })
    .eq("id", row.id)
    .is("used_at", null);

  if (updErr) {
    return { ok: false, code: "db_error", message: updErr.message };
  }

  return {
    ok: true,
    reservationId: row.reservation_id as string,
    reservationItemId: row.reservation_item_id as string,
    tokenId: row.id as string,
  };
}
