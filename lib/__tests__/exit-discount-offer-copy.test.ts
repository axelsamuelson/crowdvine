import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EXIT_DISCOUNT_OFFER_CTA,
  EXIT_DISCOUNT_OFFER_HEADING,
  exitDiscountEmailBodyLines,
  exitDiscountOfferTerms,
} from "@/lib/exit-discount/offer-copy";

describe("exit discount offer copy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses reservation wording and terms from config validity", async () => {
    vi.stubEnv("EXIT_DISCOUNT_VALIDITY_DAYS", undefined);
    const { exitDiscountValidityDays } = await import(
      "@/lib/exit-discount/config"
    );
    const days = exitDiscountValidityDays();
    expect(days).toBe(14);

    expect(EXIT_DISCOUNT_OFFER_HEADING).toBe(
      "10 % på vinet i din första reservation",
    );
    expect([...exitDiscountOfferTerms(days)]).toEqual([
      "Gäller vinet, inte frakten.",
      "Kan inte kombineras med PACT Points.",
      "Gäller inte Meigoon Box.",
      `Gäller i ${days} dagar. Vi mejlar koden till dig.`,
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
    expect(joined).toContain("första reservation");
    expect(joined).toContain("på vinet");
    expect(joined).toContain("inte på frakten");
    expect(joined).toContain("PACT Points");
    expect(joined).toContain("Meigoon Box");
    expect(joined.toLowerCase()).not.toMatch(/skynda|sista chansen|endast idag/);
  });
});
