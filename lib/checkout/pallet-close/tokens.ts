import { createHash, randomBytes } from "node:crypto";
import { getAppUrl } from "@/lib/app-url";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { PalletCloseAction } from "@/lib/checkout/pallet-close/types";

const TOKEN_BYTES = 32;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function mintRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function actionPathSegment(action: PalletCloseAction): string {
  if (action === "switch_direct") return "switch-direct";
  return action;
}

export function buildPalletCloseActionPath(
  action: PalletCloseAction,
  rawToken: string,
): string {
  return `/pallet-close/${actionPathSegment(action)}?token=${encodeURIComponent(rawToken)}`;
}

export function buildPalletCloseActionUrl(
  action: PalletCloseAction,
  rawToken: string,
  origin?: string,
): string {
  const base = (origin?.trim() || getAppUrl()).replace(/\/$/, "");
  return `${base}${buildPalletCloseActionPath(action, rawToken)}`;
}

export async function createPalletCloseActionToken(opts: {
  reservationId: string;
  action: PalletCloseAction;
  expiresAt: Date;
  origin?: string;
}): Promise<{ rawToken: string; url: string; expiresAt: string }> {
  const rawToken = mintRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = opts.expiresAt.toISOString();
  const sb = getSupabaseAdmin();

  const { error } = await sb.from("pallet_close_action_tokens").insert({
    reservation_id: opts.reservationId,
    action: opts.action,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`Failed to create pallet-close token: ${error.message}`);
  }

  return {
    rawToken,
    url: buildPalletCloseActionUrl(opts.action, rawToken, opts.origin),
    expiresAt,
  };
}

export type ConsumePalletCloseTokenResult =
  | {
      ok: true;
      reservationId: string;
      action: PalletCloseAction;
      tokenId: string;
    }
  | {
      ok: false;
      code: "missing_token" | "not_found" | "expired" | "already_used" | "db_error";
      message: string;
    };

export async function consumePalletCloseActionToken(
  rawToken: string,
  expectedAction: PalletCloseAction,
  now: Date = new Date(),
): Promise<ConsumePalletCloseTokenResult> {
  const token = rawToken.trim();
  if (!token) {
    return { ok: false, code: "missing_token", message: "Token saknas." };
  }

  const tokenHash = hashToken(token);
  const sb = getSupabaseAdmin();

  const { data: row, error } = await sb
    .from("pallet_close_action_tokens")
    .select("id, reservation_id, action, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .eq("action", expectedAction)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "db_error", message: error.message };
  }
  if (!row) {
    return { ok: false, code: "not_found", message: "Länken är ogiltig." };
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
    return { ok: false, code: "expired", message: "Länken har gått ut." };
  }

  const { data: updated, error: upErr } = await sb
    .from("pallet_close_action_tokens")
    .update({ used_at: now.toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (upErr) {
    return { ok: false, code: "db_error", message: upErr.message };
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
    reservationId: String(row.reservation_id),
    action: expectedAction,
    tokenId: String(row.id),
  };
}
