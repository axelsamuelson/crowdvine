import { describe, expect, it } from "vitest";
import { sumDirectBoxCartMoney } from "@/lib/commerce/direct-box-cart-subtotal";

describe("sumDirectBoxCartMoney", () => {
  it("marks up catalog line totals to whole kronor (Camille 496→521)", () => {
    const money = sumDirectBoxCartMoney(
      [
        {
          quantity: 6,
          cost: { totalAmount: { amount: "2976" } },
          merchandise: { product: { producerBoostActive: false } },
        },
      ],
      5,
    );
    expect(money.subtotalSek).toBe(3126);
    expect(money.nonBoostedLineTotalSek).toBe(3126);
    expect(money.boostedLineTotalSek).toBe(0);
  });
});
