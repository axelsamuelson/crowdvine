import { describe, expect, it } from "vitest";
import {
  GUEST_ENSURE_SESSION_TIMEOUT_MS,
  resolveGuestEnsureSessionOutcome,
  shouldClearGuestEnsureAttemptOnCleanup,
} from "@/lib/checkout/guest-ensure-session-client";

describe("guest-ensure-session-client", () => {
  it("exposes a finite timeout for Steg 4 preparing UI", () => {
    expect(GUEST_ENSURE_SESSION_TIMEOUT_MS).toBeGreaterThanOrEqual(5_000);
    expect(GUEST_ENSURE_SESSION_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });

  it("applies session tokens even when the effect was cancelled (first-visit race)", () => {
    const outcome = resolveGuestEnsureSessionOutcome({
      cancelled: true,
      status: 200,
      data: {
        ok: true,
        autoSignedIn: true,
        session: {
          access_token: "tok_access",
          refresh_token: "tok_refresh",
        },
      },
    });
    expect(outcome).toEqual({
      kind: "apply_session",
      access_token: "tok_access",
      refresh_token: "tok_refresh",
    });
  });

  it("still marks alreadyAuthenticated after cancel so authReady can flip", () => {
    expect(
      resolveGuestEnsureSessionOutcome({
        cancelled: true,
        status: 200,
        data: { alreadyAuthenticated: true },
      }),
    ).toEqual({ kind: "already_authenticated" });
  });

  it("ignores requiresLogin / soft errors after cancel (avoid OTP flash on remount)", () => {
    expect(
      resolveGuestEnsureSessionOutcome({
        cancelled: true,
        status: 409,
        data: { requiresLogin: true },
      }),
    ).toEqual({ kind: "ignore" });

    expect(
      resolveGuestEnsureSessionOutcome({
        cancelled: true,
        status: 500,
        data: { error: "boom" },
      }),
    ).toEqual({ kind: "ignore" });
  });

  it("surfaces requiresLogin and errors when not cancelled", () => {
    expect(
      resolveGuestEnsureSessionOutcome({
        cancelled: false,
        status: 409,
        data: { requiresLogin: true },
      }),
    ).toEqual({ kind: "requires_login" });

    expect(
      resolveGuestEnsureSessionOutcome({
        cancelled: false,
        status: 500,
        data: { error: "  nope  " },
      }),
    ).toEqual({ kind: "error", message: "nope" });

    expect(
      resolveGuestEnsureSessionOutcome({
        cancelled: false,
        status: 200,
        data: {},
      }),
    ).toEqual({ kind: "error", message: null });
  });

  it("clears the one-shot attempted email on cleanup unless session already applied", () => {
    expect(shouldClearGuestEnsureAttemptOnCleanup(false)).toBe(true);
    expect(shouldClearGuestEnsureAttemptOnCleanup(true)).toBe(false);
  });
});
