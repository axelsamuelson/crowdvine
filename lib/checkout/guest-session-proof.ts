/**
 * Same-browser proof that this guest just completed open-platform
 * ensure-session for a given email — so reload + re-enter email can remint
 * a session without reopening the #246 account-takeover hole.
 *
 * Security:
 * - httpOnly + Secure + SameSite=Lax cookie (not readable by JS)
 * - HMAC payload bound to normalized email + userId + expiry
 * - Without a valid proof, existing emails still get 409 requiresLogin
 * - Remint only for role=user checkout guests (never admins)
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const CHECKOUT_GUEST_PROOF_COOKIE = "pact_checkout_guest_proof";

/** 2h — long enough for a checkout session; short enough to limit theft window. */
export const CHECKOUT_GUEST_PROOF_TTL_SEC = 60 * 60 * 2;

const TOKEN_VERSION = "v1";

function signingSecret(): string {
  const secret =
    process.env.CHECKOUT_GUEST_PROOF_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("No secret available for checkout guest proof cookies");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type GuestSessionProofClaims = {
  email: string;
  userId: string;
  exp: number;
};

/**
 * Mint opaque token: v1.<b64(email)>.<b64(userId)>.<exp>.<sig>
 */
export function mintGuestSessionProofToken(
  email: string,
  userId: string,
  nowMs: number = Date.now(),
): string {
  const normalized = email.trim().toLowerCase();
  const uid = userId.trim();
  if (!normalized || !uid) {
    throw new Error("guest proof requires email and userId");
  }
  const exp = Math.floor(nowMs / 1000) + CHECKOUT_GUEST_PROOF_TTL_SEC;
  const emailPart = Buffer.from(normalized, "utf8").toString("base64url");
  const uidPart = Buffer.from(uid, "utf8").toString("base64url");
  const payload = `${TOKEN_VERSION}.${emailPart}.${uidPart}.${exp}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

export function verifyGuestSessionProofToken(
  token: string,
  expectedEmail: string,
  nowMs: number = Date.now(),
): { ok: true; claims: GuestSessionProofClaims } | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 5) return { ok: false, error: "invalid_token" };
  const [version, emailPart, uidPart, expPart, sig] = parts;
  if (version !== TOKEN_VERSION || !emailPart || !uidPart || !expPart || !sig) {
    return { ok: false, error: "invalid_token" };
  }
  const payload = `${version}.${emailPart}.${uidPart}.${expPart}`;
  let expectedSig: string;
  try {
    expectedSig = signPayload(payload);
  } catch {
    return { ok: false, error: "misconfigured" };
  }
  if (!safeEqual(sig, expectedSig)) {
    return { ok: false, error: "invalid_signature" };
  }
  const exp = Number.parseInt(expPart, 10);
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) {
    return { ok: false, error: "expired" };
  }
  let email: string;
  let userId: string;
  try {
    email = Buffer.from(emailPart, "base64url").toString("utf8").trim().toLowerCase();
    userId = Buffer.from(uidPart, "base64url").toString("utf8").trim();
  } catch {
    return { ok: false, error: "invalid_payload" };
  }
  if (!email.includes("@") || !userId) {
    return { ok: false, error: "invalid_payload" };
  }
  const want = expectedEmail.trim().toLowerCase();
  if (!safeEqual(email, want)) {
    return { ok: false, error: "email_mismatch" };
  }
  return { ok: true, claims: { email, userId, exp } };
}

export function readGuestSessionProofFromRequest(
  request: NextRequest,
  email: string,
): GuestSessionProofClaims | null {
  const raw = request.cookies.get(CHECKOUT_GUEST_PROOF_COOKIE)?.value;
  if (!raw) return null;
  const verified = verifyGuestSessionProofToken(raw, email);
  return verified.ok ? verified.claims : null;
}

export function guestProofCookieOptions(maxAgeSec: number = CHECKOUT_GUEST_PROOF_TTL_SEC): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  };
}
