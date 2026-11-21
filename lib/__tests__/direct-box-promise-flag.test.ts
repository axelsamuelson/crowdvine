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

  it("checkout shows direct promise when direct_box is selectable", () => {
    const checkout = readFileSync(
      resolve(process.cwd(), "app/checkout/checkout-client.tsx"),
      "utf8",
    );
    expect(checkout).toMatch(
      /fulfillmentChannel === "direct_box" &&\s*directBoxCheckoutEnabled &&\s*directBoxAvailability\.deliverySelectable/,
    );
    expect(checkout).toMatch(/DirectBoxDeliveryPromise/);
    expect(checkout).toMatch(/commerce\.sharedPalletDelivery/);
    expect(checkout).toMatch(/checkout\.dualOfferSharedTitle/);
    expect(checkout).toMatch(/checkout\.dualOfferDirectTitle/);
  });
});

describe("DirectBoxDeliveryPromise uses locale messages only", () => {
  it("does not append a hardcoded SV ETA that would leak into EN", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/commerce/direct-box-delivery-promise.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/B2C_DIRECT_BOX_DELIVERY_TIME_TODO/);
    expect(src).not.toMatch(/showTimeTodo/);
    expect(src).toMatch(/DIRECT_BOX_DELIVERY_MESSAGE_KEY/);
  });
});

