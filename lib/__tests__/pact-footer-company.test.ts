import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PACT_FOOTER_COMPANY_EMAIL,
  PACT_FOOTER_COMPANY_SEP,
  pactFooterCompanyPlain,
} from "@/lib/pact-footer-company";

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("PACT footer company disclosure", () => {
  it("keeps legal SV/EN wording character-for-character", () => {
    expect(pactFooterCompanyPlain("sv")).toBe(
      "EURPACT OÜ · Tartu mnt 67/1-13b, 10115 Tallinn, Estland · Reg.nr 17538270 · customer@pactwines.com",
    );
    expect(pactFooterCompanyPlain("en")).toBe(
      "EURPACT OÜ · Tartu mnt 67/1-13b, 10115 Tallinn, Estonia · Reg. no. 17538270 · customer@pactwines.com",
    );
    expect(PACT_FOOTER_COMPANY_SEP).toBe(" · ");
    expect(PACT_FOOTER_COMPANY_EMAIL).toBe("customer@pactwines.com");
  });

  it("renders the company block only on PACT and mailto for the email", () => {
    const footerSrc = read("components/layout/footer.tsx");
    expect(footerSrc).toMatch(/data-testid="pact-footer-company"/);
    expect(footerSrc).toMatch(/!isDirtywineSite/);
    expect(footerSrc).toMatch(
      /mailto:\$\{PACT_FOOTER_COMPANY_EMAIL\}/,
    );
    expect(footerSrc).toMatch(/omitMailto=\{!isDirtywineSite\}/);
    // Contrast-safe on dark footer panel — not muted-foreground.
    expect(footerSrc).toMatch(/text-background\/80/);
    expect(footerSrc).not.toMatch(
      /data-testid="pact-footer-company"[\s\S]*?text-muted-foreground/,
    );
  });

  it("does not touch PDP seller disclosure files", () => {
    expect(read("components/commerce/pact-seller-consumer-info.tsx")).toBeTruthy();
  });
});
