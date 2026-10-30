import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("cart/checkout display wiring", () => {
  it("builds discount labels via formatCartDiscountLabel (not early-bird-only)", () => {
    const cartService = read("src/lib/cart-service.ts");
    expect(cartService).toContain("formatCartDiscountLabel");
    expect(cartService).not.toMatch(/Early-bird · \$\{/);
    expect(cartService).not.toContain("Early-bird ·");
  });

  it("formats cart and checkout amounts with the line/cart currency code", () => {
    const cartItem = read("components/cart/cart-item.tsx");
    const modal = read("components/cart/modal.tsx");
    const checkout = read("app/checkout/checkout-client.tsx");
    const addToCartCase = read("components/cart/AddToCartCase.tsx");

    expect(cartItem).toContain("formatCartLinePrice");
    expect(cartItem).toContain("item.cost.totalAmount.currencyCode");
    expect(modal).toContain("formatCartLinePrice");
    expect(modal).toContain("cart.cost.totalAmount.currencyCode");

    expect(checkout).toContain("formatCartLinePrice");
    expect(checkout).toContain("formatChargedAmount");
    expect(checkout).not.toMatch(/\$\{Math\.round\([^)]+\)\} kr/);

    // Case sheet prices are SEK storage → convert via formatSek, never formatPrice(..., "SEK")
    expect(addToCartCase).toContain("formatSek");
    expect(addToCartCase).not.toMatch(/formatPrice\([^)]*[\"']SEK[\"']/);
  });
});
