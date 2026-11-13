import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Production may have PLATFORM_OPEN=true before migration 291. With the guest
 * flag OFF, no code path may read or write guest_checkout_at / account_claimed_at.
 */
describe("guest checkout columns are flag-gated (pre-migration safe)", () => {
  const ensureSrc = readFileSync(
    join(process.cwd(), "app/api/checkout/ensure-session/route.ts"),
    "utf8",
  );
  const claimSrc = readFileSync(
    join(process.cwd(), "app/api/checkout/claim-guest-account/route.ts"),
    "utf8",
  );
  const reservationsSrc = readFileSync(
    join(process.cwd(), "app/api/user/reservations/[id]/route.ts"),
    "utf8",
  );
  const confirmSrc = readFileSync(
    join(process.cwd(), "app/api/checkout/confirm/route.ts"),
    "utf8",
  );

  it("ensure-session only writes guest_checkout_at inside guestCheckoutEnabled branch", () => {
    expect(ensureSrc).toMatch(
      /if \(guestCheckoutEnabled\) \{\s*profileInsert\.guest_checkout_at = now;/,
    );
    // Must not unconditionally put guest_checkout_at on the insert object.
    expect(ensureSrc).not.toMatch(
      /insert\(\{[\s\S]*guest_checkout_at:\s*now/,
    );
  });

  it("claim-guest-account requires guest flag (not PLATFORM_OPEN alone)", () => {
    expect(claimSrc).toContain("if (!isGuestCheckoutEnabled())");
    expect(claimSrc).not.toContain("isPlatformOpen");
  });

  it("reservations detail select includes guest columns only when flag on", () => {
    expect(reservationsSrc).toContain("guestCheckoutEnabled");
    expect(reservationsSrc).toContain("guest_checkout_at, account_claimed_at");
    expect(reservationsSrc).toContain(': "full_name, email"');
  });

  it("confirm guest_checkout_completed only queries columns when flag on", () => {
    expect(confirmSrc).toContain(
      "currentUser?.id && isGuestCheckoutEnabled()",
    );
  });
});
