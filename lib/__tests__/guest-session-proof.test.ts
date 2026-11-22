import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mintGuestSessionProofToken,
  verifyGuestSessionProofToken,
} from "@/lib/checkout/guest-session-proof";

describe("guest-session-proof", () => {
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prevCron = process.env.CRON_SECRET;
  const prevProof = process.env.CHECKOUT_GUEST_PROOF_SECRET;

  beforeEach(() => {
    process.env.CHECKOUT_GUEST_PROOF_SECRET = "test-guest-proof-secret";
    delete process.env.CRON_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    if (prevProof === undefined) delete process.env.CHECKOUT_GUEST_PROOF_SECRET;
    else process.env.CHECKOUT_GUEST_PROOF_SECRET = prevProof;
    if (prevCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevCron;
    if (prevService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
  });

  it("round-trips email + userId", () => {
    const token = mintGuestSessionProofToken(
      "Camille.Test@Example.com",
      "uid-abc",
      1_700_000_000_000,
    );
    const verified = verifyGuestSessionProofToken(
      token,
      "camille.test@example.com",
      1_700_000_000_000,
    );
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.claims.email).toBe("camille.test@example.com");
    expect(verified.claims.userId).toBe("uid-abc");
  });

  it("rejects wrong email (no takeover for another address)", () => {
    const token = mintGuestSessionProofToken("a@example.com", "uid-1");
    const verified = verifyGuestSessionProofToken(token, "b@example.com");
    expect(verified.ok).toBe(false);
  });

  it("rejects tampered signature", () => {
    const token = mintGuestSessionProofToken("a@example.com", "uid-1");
    const parts = token.split(".");
    parts[4] = "tampered";
    const verified = verifyGuestSessionProofToken(parts.join("."), "a@example.com");
    expect(verified.ok).toBe(false);
  });

  it("rejects expired token", () => {
    const now = 1_700_000_000_000;
    const token = mintGuestSessionProofToken("a@example.com", "uid-1", now);
    const verified = verifyGuestSessionProofToken(
      token,
      "a@example.com",
      now + 3 * 60 * 60 * 1000,
    );
    expect(verified.ok).toBe(false);
  });
});
