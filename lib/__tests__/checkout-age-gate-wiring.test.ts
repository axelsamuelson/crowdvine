import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const checkoutSrc = readFileSync(
  join(process.cwd(), "app/checkout/checkout-client.tsx"),
  "utf8",
);

describe("checkout age-gate / address wiring (hotfix)", () => {
  it("unlocks age via computeDeliveryCompleteForAgeUnlock (not quote gate)", () => {
    expect(checkoutSrc).toMatch(/computeDeliveryCompleteForAgeUnlock/);
    expect(checkoutSrc).toMatch(/isCheckoutPurchaseBlockedByQuote/);
    // Quote must not sit inside deliveryComplete anymore.
    expect(checkoutSrc).not.toMatch(
      /const deliveryComplete = useMemo\(\s*\(\)\s*=>\s*\{[\s\S]*shouldBlockCheckoutOnQuote/,
    );
  });

  it("collapses address only with strict contact helpers", () => {
    expect(checkoutSrc).toMatch(/isCheckoutContactComplete/);
    expect(checkoutSrc).toMatch(/isCheckoutEmailComplete/);
    expect(checkoutSrc).toMatch(/isCheckoutPhoneComplete/);
    expect(checkoutSrc).not.toMatch(
      /addressStepComplete[\s\S]{0,200}includes\("@\"\)/,
    );
  });

  it("fetches quote only after authReady (no pre-session 401 noise)", () => {
    expect(checkoutSrc).toMatch(/authReady,/);
    expect(checkoutSrc).toMatch(/if \(!authReady\) \{\s*setServerQuote\(null\);\s*setQuoteStatus\("idle"\);/);
    expect(checkoutSrc).toMatch(/res\.status === 401/);
    expect(checkoutSrc).toMatch(/reason: "auth_required"/);
    expect(checkoutSrc).toMatch(/quote_timeout/);
  });

  it("emits checkout_step_blocked only on continue / locked-step attempts", () => {
    expect(checkoutSrc).toMatch(/handleLockedAgeStepAttempt/);
    expect(checkoutSrc).toMatch(/trackCheckoutStepBlocked\(\{\s*step: "payment"/);
    expect(checkoutSrc).not.toMatch(/step: "continue"/);
    // No passive age_terms fire on hasPostalCode && !deliveryComplete field status.
    expect(checkoutSrc).not.toMatch(
      /if \(!hasPostalCode \|\| deliveryComplete\) return;[\s\S]{0,200}trackCheckoutStepBlocked/,
    );
  });

  it("persists guest address after auth without waiting for payment card", () => {
    expect(checkoutSrc).toMatch(
      /After guest ensure-session: persist draft to DB/,
    );
    expect(checkoutSrc).toMatch(
      /if \(!authReady \|\| !deliveryComplete\) return;/,
    );
    expect(checkoutSrc).not.toMatch(
      /if \(!authReady \|\| !paymentCardRevealed\) return;/,
    );
  });

  it("wires shipping_quote_failed tracker", () => {
    expect(checkoutSrc).toMatch(/trackShippingQuoteFailed/);
  });
});
