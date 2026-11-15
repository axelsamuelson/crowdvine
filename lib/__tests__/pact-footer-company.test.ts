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

  it("stacks three lines below md with responsive · separators (no duplicate text)", () => {
    const footerSrc = read("components/layout/footer.tsx");
    expect(footerSrc).toMatch(/block md:inline/);
    expect(footerSrc).toMatch(/hidden md:inline/);
    // Separators between lines 1–2 / 2–3 are md-only; reg↔email keeps · always.
    const companyBlock = footerSrc.match(
      /data-testid="pact-footer-company"[\s\S]*?<\/p>/,
    )?.[0];
    expect(companyBlock).toBeTruthy();
    expect(companyBlock).toMatch(/companySegments\[0\]/);
    expect(companyBlock).toMatch(/companySegments\[1\]/);
    expect(companyBlock).toMatch(/companySegments\[2\][\s\S]*?PACT_FOOTER_COMPANY_SEP[\s\S]*?mailto/);
    // No second sr-visible copy of the plain legal string.
    expect(companyBlock).not.toMatch(/sr-only|pactFooterCompanyPlain/);
  });

  it("does not touch PDP seller disclosure files", () => {
    expect(read("components/commerce/pact-seller-consumer-info.tsx")).toBeTruthy();
  });
});
