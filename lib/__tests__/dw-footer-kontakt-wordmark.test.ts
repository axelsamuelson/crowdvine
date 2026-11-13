import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DIRTYWINE_CONTACT_EMAIL,
  DIRTYWINE_WORDMARK,
  PACT_WORDMARK,
  getSiteWordmark,
} from "@/lib/b2b/brand";

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("getSiteWordmark", () => {
  it("returns DIRTY WINE on Dirty Wine and PACT otherwise", () => {
    expect(getSiteWordmark(true)).toBe("DIRTY WINE");
    expect(getSiteWordmark(false)).toBe("PACT");
    expect(DIRTYWINE_WORDMARK).toBe("DIRTY WINE");
    expect(PACT_WORDMARK).toBe("PACT");
  });
});

describe("Dirty Wine footer Kontakt link", () => {
  const footerSrc = read("components/layout/footer.tsx");

  it("adds Kontakt mailto only behind the Dirty Wine site hint", () => {
    expect(footerSrc).toMatch(/DIRTYWINE_CONTACT_EMAIL/);
    expect(footerSrc).toContain("Kontakt");
    expect(footerSrc).toMatch(
      /isDirtywineSite\s*\?\s*\([\s\S]*?mailto:\$\{DIRTYWINE_CONTACT_EMAIL\}[\s\S]*?Kontakt/,
    );
    expect(DIRTYWINE_CONTACT_EMAIL).toBe("hello@dirtywine.se");
  });

  it("styles Kontakt like other footer text links", () => {
    expect(footerSrc).toMatch(
      /Kontakt[\s\S]*?text-sm text-background\/70 hover:text-background transition-colors hover:underline|text-sm text-background\/70 hover:text-background transition-colors hover:underline[\s\S]*?Kontakt/,
    );
  });

  it("does not add Kontakt outside the Dirty Wine branch", () => {
    // PACT path must not hard-code Kontakt as a bare unconditional link.
    const kontaktBlocks = [
      ...footerSrc.matchAll(/Kontakt/g),
    ];
    expect(kontaktBlocks.length).toBe(1);
    expect(footerSrc).toMatch(/isDirtywineSite \? \(/);
  });
});

describe("logo wordmark fallback follows site", () => {
  const headerLogoSrc = read("components/layout/header/logo-svg.tsx");
  const footerLogoSrc = read("components/layout/footer-logo-svg.tsx");

  it("uses getSiteWordmark + useB2BModeServerHint in header and footer logos", () => {
    for (const src of [headerLogoSrc, footerLogoSrc]) {
      expect(src).toMatch(/useB2BModeServerHint/);
      expect(src).toMatch(/getSiteWordmark/);
      expect(src).not.toMatch(/\bPACT\b(?!_WORDMARK)/);
      expect(src).not.toMatch(/dirtywine\.se/);
    }
  });

  it("renders the resolved wordmark label in the text fallback", () => {
    expect(headerLogoSrc).toMatch(/label=\{wordmark\}/);
    expect(footerLogoSrc).toMatch(/label=\{wordmark\}/);
  });
});
