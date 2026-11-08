import { describe, expect, it } from "vitest";
import { checkoutChargeTimingMessageKey } from "@/lib/checkout/charge-timing-copy";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("checkoutChargeTimingMessageKey", () => {
  it("uses immediate-charge copy for payment_intent (Pay now path)", () => {
    expect(
      checkoutChargeTimingMessageKey({ paymentMode: "payment_intent" }),
    ).toBe("chargedOnConfirm");
    expect(
      checkoutChargeTimingMessageKey({
        paymentMode: "payment_intent",
        isUsConditional: false,
      }),
    ).toBe("chargedOnConfirm");
  });

  it("uses deferred pallet-close copy for shared-pallet setup_intent", () => {
    expect(
      checkoutChargeTimingMessageKey({ paymentMode: "setup_intent" }),
    ).toBe("noChargeUntilPalletCloses");
  });

  it("omits pallet-close claim for US conditional setup_intent", () => {
    expect(
      checkoutChargeTimingMessageKey({
        paymentMode: "setup_intent",
        isUsConditional: true,
      }),
    ).toBeNull();
  });

  it("renders no charge-timing claim while mode is unknown/loading", () => {
    expect(checkoutChargeTimingMessageKey({ paymentMode: null })).toBeNull();
    expect(
      checkoutChargeTimingMessageKey({ paymentMode: undefined }),
    ).toBeNull();
  });
});

describe("checkout charge-timing wiring", () => {
  it("checkout footer uses model-aware helper (not unconditional deferred copy)", () => {
    const checkout = readFileSync(
      join(__dirname, "../../app/checkout/checkout-client.tsx"),
      "utf8",
    );
    expect(checkout).toContain("checkoutChargeTimingMessageKey");
    expect(checkout).toContain("chargeTimingCopyKey");
    // Must not still hardcode deferred string as the only footer line
    expect(checkout).not.toMatch(
      /\{\s*t\("checkout\.noChargeUntilPalletCloses"\)\s*\}/,
    );
  });

  it("sv/en define chargedOnConfirm and keep deferred key", () => {
    const en = JSON.parse(
      readFileSync(join(__dirname, "../../messages/en.json"), "utf8"),
    );
    const sv = JSON.parse(
      readFileSync(join(__dirname, "../../messages/sv.json"), "utf8"),
    );
    expect(en.checkout.chargedOnConfirm).toMatch(/charged now|confirm/i);
    expect(sv.checkout.chargedOnConfirm).toMatch(/debiteras nu|bekräftar/i);
    expect(en.checkout.noChargeUntilPalletCloses).toMatch(/not charged now|pallet closes/i);
    expect(sv.checkout.noChargeUntilPalletCloses).toMatch(/Inget dras nu|pallen stänger/i);
    // Immediate copy must not claim deferred
    expect(en.checkout.chargedOnConfirm).not.toMatch(/pallet closes|not charged now/i);
    expect(sv.checkout.chargedOnConfirm).not.toMatch(/pallen stänger|Inget dras nu/i);
  });
});
