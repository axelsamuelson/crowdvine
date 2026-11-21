import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../..");

function loadMessages(locale: "sv" | "en") {
  return JSON.parse(
    readFileSync(join(root, "messages", `${locale}.json`), "utf8"),
  ) as { checkout: Record<string, string> };
}

describe("checkout step 1 delivery copy (leveranstexter)", () => {
  it("uses Skickas från / Ships from (not Insamlat/Collected)", () => {
    const sv = loadMessages("sv");
    const en = loadMessages("en");
    expect(sv.checkout.collectedFrom).toBe("Skickas från: {name}");
    expect(en.checkout.collectedFrom).toBe("Ships from: {name}");
    expect(sv.checkout.collectedFrom).not.toMatch(/Insamlat/i);
    expect(en.checkout.collectedFrom).not.toMatch(/Collected from/i);
  });

  it("explains missing postal under the gray CTA", () => {
    const sv = loadMessages("sv");
    const en = loadMessages("en");
    expect(sv.checkout.fillPostalToContinue).toBe(
      "Fyll i postnummer för att gå vidare",
    );
    expect(en.checkout.fillPostalToContinue).toBe(
      "Enter a postal code to continue",
    );
  });

  it("explains when delivery cannot be calculated for a postal", () => {
    const sv = loadMessages("sv");
    const en = loadMessages("en");
    expect(sv.checkout.shippingUnavailableForPostal).toMatch(/postnummer/i);
    expect(en.checkout.shippingUnavailableForPostal).toMatch(/postal/i);
  });
});
