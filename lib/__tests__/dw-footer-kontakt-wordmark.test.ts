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

  it("places Kontakt as the third Navigation row after Hem and Butik", () => {
    const navBlock = footerSrc.match(
      /id="footer-navigation-label"[\s\S]*?<\/nav>/,
    )?.[0];
    expect(navBlock).toBeTruthy();
    expect(navBlock).toMatch(
      /t\("common\.home"\)[\s\S]*?t\("common\.shop"\)[\s\S]*?Kontakt/,
    );
    expect(navBlock).toMatch(
      /isDirtywineSite\s*\?\s*\([\s\S]*?mailto:\$\{DIRTYWINE_CONTACT_EMAIL\}[\s\S]*?Kontakt/,
    );
    expect(DIRTYWINE_CONTACT_EMAIL).toBe("hello@dirtywine.se");
  });

  it("styles Kontakt like Hem/Butik footer text links", () => {
    expect(footerSrc).toMatch(
      /mailto:\$\{DIRTYWINE_CONTACT_EMAIL\}[\s\S]*?className="text-sm text-background\/70 hover:text-background transition-colors hover:underline"[\s\S]*?Kontakt/,
    );
  });

  it("does not place Kontakt near Hjälp/copyright and keeps a single Dirty Wine instance", () => {
    expect(footerSrc).toMatch(/<OnboardingButton \/>\s*<p className="text-base text-background\/60">/);
    const kontaktBlocks = [...footerSrc.matchAll(/Kontakt/g)];
    expect(kontaktBlocks.length).toBe(1);
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
