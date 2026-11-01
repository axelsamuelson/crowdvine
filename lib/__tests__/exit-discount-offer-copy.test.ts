import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EXIT_DISCOUNT_OFFER_CTA,
  EXIT_DISCOUNT_OFFER_HEADING,
  exitDiscountEmailBodyLines,
  exitDiscountOfferTerms,
} from "@/lib/exit-discount/offer-copy";
import { buildExitDiscountEmailHtml } from "@/lib/exit-discount/email";

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

  it("email body contains only the code (+ legal footer), no marketing", () => {
    const lines = exitDiscountEmailBodyLines({
      code: "PACT10-ABCD",
    });
    const joined = lines.join("\n");
    expect(joined).toContain("Din rabattkod: PACT10-ABCD");
    expect(joined).toContain("EURPACT OÜ (registrikood 17538270)");
    expect(joined).not.toContain("Välj viner");
    expect(joined).not.toContain("pactwines.com/vin");
    expect(joined).not.toContain("Ange koden i kassan");
    expect(joined.toLowerCase()).not.toMatch(/skynda|sista chansen|endast idag/);

    const html = buildExitDiscountEmailHtml({ code: "PACT10-ABCD" });
    expect(html).toContain("PACT10-ABCD");
    expect(html).toContain("Din rabattkod:");
    expect(html).not.toContain("Välj viner");
    expect(html).not.toContain("pactwines.com/vin");
    expect(html).not.toMatch(/logo|img src/i);
  });
});
