import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("DirectBoxDeliveryPromise gated by DIRECT_BOX_CHECKOUT_ENABLED", () => {
  it("component checks isDirectBoxCheckoutEnabled / enabled prop", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/commerce/direct-box-delivery-promise.tsx"),
      "utf8",
    );
    expect(src).toMatch(/isDirectBoxCheckoutEnabled/);
    expect(src).toMatch(/enabled/);
    expect(src).toMatch(/if \(!show\) return null/);
  });

  it("PDP layout passes server flag into PalletStatusBar", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "components/product/product-pdp-layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/isDirectBoxCheckoutEnabled/);
    expect(layout).toMatch(/showDirectBoxPromise=\{isDirectBoxCheckoutEnabled\(\)\}/);
  });

  it("checkout shows direct promise only when directBoxCheckoutEnabled", () => {
    const checkout = readFileSync(
      resolve(process.cwd(), "app/checkout/checkout-client.tsx"),
      "utf8",
    );
    expect(checkout).toMatch(
      /directBoxCheckoutEnabled && producerDirectBoxOnly/,
    );
    expect(checkout).toMatch(/checkout\.deliveryEstimate2to3Weeks/);
  });
});

