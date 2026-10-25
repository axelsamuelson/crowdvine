import { describe, expect, it } from "vitest";

import { formatCartDiscountLabel } from "@/lib/cart/discount-label";
import {
  formatCartLinePrice,
  formatMoney,
} from "@/lib/shopping-context/format";

describe("cart drawer currency", () => {
  it("prints 87 kr when a converted amount is formatted as Swedish kronor", () => {
    expect(formatMoney(87, "SEK", "sv").replace(/\u00a0/g, " ")).toBe("87 kr");
  });

  it("formats the line currency instead of a SEK context", () => {
    expect(formatCartLinePrice(87, "USD", "en").replace(/\u00a0/g, " ")).toBe(
      "$87.0",
    );
  });
});

describe("cart discount label", () => {
  it("lists Privilege and early-bird together", () => {
    expect(
      formatCartDiscountLabel({
        memberName: "Privilege",
        memberPercent: 15,
        earlyBirdPercent: 20,
      }),
    ).toBe("Privilege 15% · Early-bird 20%");
  });

  it("does not use an early-bird-only label when a member discount also applies", () => {
    const label = formatCartDiscountLabel({
      memberName: "Privilege",
      memberPercent: 15,
      earlyBirdPercent: 20,
    });
    expect(label).not.toBe("Early-bird · 20% off");
    expect(label).toContain("Privilege 15%");
    expect(label).toContain("Early-bird 20%");
  });

  it("shows only the discount that applies", () => {
    expect(
      formatCartDiscountLabel({
        memberName: "Privilege",
        memberPercent: 15,
        earlyBirdPercent: 0,
      }),
    ).toBe("Privilege 15%");
    expect(
      formatCartDiscountLabel({
        memberName: null,
        memberPercent: 0,
        earlyBirdPercent: 20,
      }),
    ).toBe("Early-bird 20%");
  });
});
