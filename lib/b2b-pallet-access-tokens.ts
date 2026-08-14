import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { producerHasWinesOnShipment } from "@/lib/producer-b2b-pallets";

const TOKEN_BYTES = 32;
const DEFAULT_TTL_DAYS = 180;

export type B2bPalletAccessGrant = {
  tokenId: string;
  shipmentId: string;
  producerId: string;
  expiresAt: string;
};

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function mintRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function buildProducerPalletSharePath(
  shipmentId: string,
  rawToken: string,
): string {
  return `/producer/pallets/${shipmentId}?token=${encodeURIComponent(rawToken)}`;
}

export function buildProducerPalletShareUrl(
  origin: string,
  shipmentId: string,
  rawToken: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildProducerPalletSharePath(shipmentId, rawToken)}`;
}

/** Create a new opaque share token for this producer on the shipment. */
export async function createB2bPalletAccessToken(opts: {
  shipmentId: string;
  producerId: string;
  createdBy?: string | null;
  origin: string;
}): Promise<{ url: string; path: string; expiresAt: string }> {
  const onPallet = await producerHasWinesOnShipment(
    opts.producerId,
    opts.shipmentId,
  );
  if (!onPallet) {
    throw new Error("Producer has no wines on this pallet");
  }

  const rawToken = mintRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("b2b_pallet_access_tokens").insert({
    shipment_id: opts.shipmentId,
    producer_id: opts.producerId,
    token_hash: tokenHash,
    created_by: opts.createdBy ?? null,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  const path = buildProducerPalletSharePath(opts.shipmentId, rawToken);
  return {
    path,
    url: buildProducerPalletShareUrl(opts.origin, opts.shipmentId, rawToken),
    expiresAt,
  };
}

/** Resolve a raw token to shipment + producer (no side effects). */
export async function verifyB2bPalletAccessToken(
  rawToken: string,
): Promise<B2bPalletAccessGrant | null> {
  const trimmed = rawToken.trim();
  if (!trimmed || trimmed.length < 16 || trimmed.length > 200) {
    return null;
  }

  const tokenHash = hashToken(trimmed);
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("b2b_pallet_access_tokens")
    .select("id, shipment_id, producer_id, expires_at, revoked_at, view_count")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at as string).getTime() <= Date.now()) return null;

  return {
    tokenId: data.id as string,
    shipmentId: data.shipment_id as string,
    producerId: data.producer_id as string,
    expiresAt: data.expires_at as string,
  };
}

/** Resolve a raw token and bump view stats (for page loads). */
export async function resolveB2bPalletAccessToken(
  rawToken: string,
): Promise<B2bPalletAccessGrant | null> {
  const grant = await verifyB2bPalletAccessToken(rawToken);
  if (!grant) return null;

  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("b2b_pallet_access_tokens")
    .select("view_count")
    .eq("id", grant.tokenId)
    .maybeSingle();

  const viewCount = Number(data?.view_count) || 0;
  void sb
    .from("b2b_pallet_access_tokens")
    .update({
      last_viewed_at: new Date().toISOString(),
      view_count: viewCount + 1,
    })
    .eq("id", grant.tokenId);

  return grant;
}

/** Extract share token from request header, query, or JSON body field. */
export function extractB2bPalletAccessToken(opts: {
  headerToken?: string | null;
  queryToken?: string | null;
  bodyToken?: unknown;
}): string | null {
  const fromHeader = opts.headerToken?.trim();
  if (fromHeader) return fromHeader;

  const fromQuery = opts.queryToken?.trim();
  if (fromQuery) return fromQuery;

  if (typeof opts.bodyToken === "string" && opts.bodyToken.trim()) {
    return opts.bodyToken.trim();
  }

  return null;
}
