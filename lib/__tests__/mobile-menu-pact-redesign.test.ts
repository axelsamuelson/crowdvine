import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PACT mobile menu redesign (Inès full spec): desktop-header uppercase rows,
 * admin secondary, producers typography; Dirty Wine pills unchanged.
 */
describe("PACT mobile menu redesign", () => {
  const menuSrc = readFileSync(
    resolve(process.cwd(), "components/layout/header/mobile-menu.tsx"),
    "utf8",
  );
  const headerSrc = readFileSync(
    resolve(process.cwd(), "components/layout/header/index.tsx"),
    "utf8",
  );
  const en = JSON.parse(
    readFileSync(resolve(process.cwd(), "messages/en.json"), "utf8"),
  );
  const sv = JSON.parse(
    readFileSync(resolve(process.cwd(), "messages/sv.json"), "utf8"),
  );

  it("keeps Dirty Wine on the pill Button grid", () => {
    expect(menuSrc).toMatch(
      /isDirtywineSite \? \([\s\S]*?grid grid-cols-2[\s\S]*?uppercase bg-background\/50/,
    );
  });

  it("matches desktop header uppercase nav (Geist 500 / uppercase) for PACT rows", () => {
    // Desktop PACT nav: font-semibold text-base + uppercase
    expect(headerSrc).toMatch(
      /font-semibold text-base transition-colors duration-200/,
    );
    expect(headerSrc).toMatch(/isDirtywineSite \? "normal-case" : "uppercase"/);
    expect(menuSrc).toMatch(/data-testid="mobile-menu-nav-pact"/);
    expect(menuSrc).toMatch(/text-\[15px\] font-medium uppercase tracking-\[0\.02em\] text-\[#0A0A0A\]/);
    expect(menuSrc).toMatch(/h-14/);
    expect(menuSrc).toMatch(/border-\[rgba\(10,10,10,0\.10\)\]/);
    expect(menuSrc).toMatch(/underline decoration-1 underline-offset-4/);
    expect(menuSrc).toMatch(/active:bg-\[rgba\(10,10,10,0\.04\)\]/);
    expect(menuSrc).not.toMatch(/icon: User/);
  });

  it("orders PACT items Hem → Alla viner → Guider → Om oss → Profil; Admin secondary", () => {
    const pactBlock = menuSrc.match(
      /isDirtywineSite\s*\?\s*\[[\s\S]*?\]\s*:\s*\[([\s\S]*?)\]/,
    )?.[1];
    expect(pactBlock).toBeTruthy();
    // Shop row uses desktop header key nav.shopAll (Alla viner / All wines).
    expect(pactBlock).toMatch(/t\("nav\.shopAll"\)/);
    expect(pactBlock).not.toMatch(/t\("common\.shop"\)/);
    const order = [
      ...pactBlock!.matchAll(
        /t\("(common\.(home|guides|about|profile)|nav\.shopAll)"\)/g,
      ),
    ].map((m) => m[1]);
    expect(order).toEqual([
      "common.home",
      "nav.shopAll",
      "common.guides",
      "common.about",
      "common.profile",
    ]);
    expect(sv.nav.shopAll).toBe("Alla viner");
    expect(en.nav.shopAll).toBe("All wines");
    expect(sv.common.shop).toBe("Butik");
    expect(en.common.shop).toBe("Shop");
    expect(menuSrc).toMatch(/data-testid="mobile-menu-nav-admin"/);
    expect(menuSrc).toMatch(
      /mt-6 flex flex-col border-b border-\[rgba\(10,10,10,0\.10\)\]/,
    );
    expect(menuSrc).toMatch(/text-\[#737373\]/);
  });

  it("styles popular producers label/names for PACT only", () => {
    expect(menuSrc).toMatch(
      /text-\[13px\] font-medium uppercase tracking-\[0\.04em\] text-\[#737373\]/,
    );
    expect(menuSrc).toMatch(
      /flex h-10 items-center text-\[17px\] font-normal text-\[#0A0A0A\]/,
    );
    expect(en.home.popularProducers).toBe("Popular producers");
    expect(sv.home.popularProducers).toBe("Populära producenter");
  });

  it("keeps Close contrast + PR217 a11y/stacking hooks", () => {
    expect(menuSrc).toMatch(/data-testid="mobile-menu-close"/);
    expect(menuSrc).toMatch(/aria-label=\{t\("common\.closeMenu"\)\}/);
    expect(menuSrc).toMatch(/min-w-\[56px\]/);
    expect(menuSrc).toMatch(/h-11 min-h-11/);
    expect(menuSrc).toMatch(/text-\[15px\] font-medium text-\[#0A0A0A\]/);
    expect(menuSrc).toMatch(/fixed inset-0 z-\[60\]/);
  });

  it("tagline: not italic on PACT; EN sentence case; SV wording unchanged", () => {
    expect(menuSrc).toMatch(
      /text-\[14px\] font-normal leading-tight text-\[#737373\]/,
    );
    expect(en.home.tagline).toBe("Producers and consumers together");
    expect(sv.home.tagline).toBe("Producenter och konsumenter tillsammans");
  });
});
