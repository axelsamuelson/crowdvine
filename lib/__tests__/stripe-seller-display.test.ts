import { describe, expect, it } from "vitest";
import {
  STRIPE_GEIST_FONT_FAMILY,
  STRIPE_GEIST_SANS_WOFF2,
  stripePaymentElementBusinessName,
} from "@/lib/checkout/stripe-seller-display";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("stripe seller display + Payment Element Geist", () => {
  it("defaults business name to EURPACT OÜ (seller line)", () => {
    expect(stripePaymentElementBusinessName()).toBe("EURPACT OÜ");
  });

  it("PE fonts use absolute Geist Sans woff2 + matching family", () => {
    expect(STRIPE_GEIST_FONT_FAMILY).toBe("Geist Sans");
    expect(STRIPE_GEIST_SANS_WOFF2).toMatch(/geist-sans-latin-400-normal\.woff2$/);
    const peSrc = readFileSync(
      resolve(process.cwd(), "components/checkout/stripe-payment-section.tsx"),
      "utf8",
    );
    expect(peSrc).toMatch(/STRIPE_GEIST_SANS_WOFF2/);
    expect(peSrc).toMatch(/STRIPE_GEIST_FONT_FAMILY/);
    expect(peSrc).toMatch(/family:\s*STRIPE_GEIST_FONT_FAMILY/);
    expect(peSrc).toMatch(/billing_details/);
    expect(peSrc).toMatch(/country:\s*[\"']never[\"']/);
    expect(peSrc).toMatch(/business:\s*\{\s*name:/);
  });
});
