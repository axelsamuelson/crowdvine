import { describe, expect, it } from "vitest";
import {
  EXIT_DISCOUNT_OFFER_CTA,
  EXIT_DISCOUNT_OFFER_HEADING,
  EXIT_DISCOUNT_OFFER_TERMS,
  exitDiscountEmailBodyLines,
} from "@/lib/exit-discount/offer-copy";

describe("exit discount offer copy", () => {
  it("states wine-only, no Points, no Meigoon beside the offer", () => {
    expect(EXIT_DISCOUNT_OFFER_HEADING).toBe(
      "10 % på vinet i din första beställning",
    );
    expect([...EXIT_DISCOUNT_OFFER_TERMS]).toEqual([
      "Gäller vinet, inte frakten.",
      "Kan inte kombineras med PACT Points.",
      "Gäller inte Meigoon Box.",
    ]);
    expect(EXIT_DISCOUNT_OFFER_CTA).toBe("Skicka rabattkod");
  });

  it("keeps email body aligned with offer terms (no urgency)", () => {
    const lines = exitDiscountEmailBodyLines({
      code: "PACT10-ABCD",
      percent: 10,
      expiresLabel: "14 november 2026",
    });
    const joined = lines.join("\n");
    expect(joined).toContain("på vinet");
    expect(joined).toContain("inte på frakten");
    expect(joined).toContain("PACT Points");
    expect(joined).toContain("Meigoon Box");
    expect(joined.toLowerCase()).not.toMatch(/skynda|sista chansen|endast idag/);
  });
});
