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

  it("refetches quote after guest authReady", () => {
    expect(checkoutSrc).toMatch(/authReady,/);
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

  it("emits checkout_step_blocked and shipping_quote_failed", () => {
    expect(checkoutSrc).toMatch(/trackCheckoutStepBlocked/);
    expect(checkoutSrc).toMatch(/trackShippingQuoteFailed/);
  });
});
