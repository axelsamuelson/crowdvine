import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PACT mobile menu redesign (Inès): vertical footer-style links, order, no icons,
 * Close contrast; Dirty Wine pill grid unchanged.
 */
describe("PACT mobile menu redesign", () => {
  const menuSrc = readFileSync(
    resolve(process.cwd(), "components/layout/header/mobile-menu.tsx"),
    "utf8",
  );
  const footerSrc = readFileSync(
    resolve(process.cwd(), "components/layout/footer.tsx"),
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

  it("uses a PACT vertical list matching footer Navigation link tokens", () => {
    // Footer Navigation links: text-sm + transition-colors + hover:underline
    expect(footerSrc).toMatch(
      /className="text-sm text-background\/70 hover:text-background transition-colors hover:underline"/,
    );
    expect(menuSrc).toMatch(/data-testid="mobile-menu-nav-pact"/);
    expect(menuSrc).toMatch(
      /border-b border-border py-3 text-sm text-foreground transition-colors hover:underline/,
    );
    // No Profil-only icon / no User import on PACT path
    expect(menuSrc).not.toMatch(/from "lucide-react".*User|User \} from "lucide-react"/);
    expect(menuSrc).not.toMatch(/icon: User/);
  });

  it("orders PACT items Hem → Butik → Guider → Om oss → Profil", () => {
    const pactBlock = menuSrc.match(
      /isDirtywineSite\s*\?\s*\[[\s\S]*?\]\s*:\s*\[([\s\S]*?)\]/,
    )?.[1];
    expect(pactBlock).toBeTruthy();
    const order = [
      ...pactBlock!.matchAll(/t\("common\.(home|shop|guides|about|profile)"\)/g),
    ].map((m) => m[1]);
    expect(order).toEqual(["home", "shop", "guides", "about", "profile"]);
  });

  it("keeps Close contrast + PR217 a11y/stacking hooks", () => {
    expect(menuSrc).toMatch(/data-testid="mobile-menu-close"/);
    expect(menuSrc).toMatch(/aria-label=\{t\("common\.closeMenu"\)\}/);
    expect(menuSrc).toMatch(
      /h-11 min-h-11 min-w-11 px-3 text-foreground hover:text-foreground/,
    );
    expect(menuSrc).toMatch(/fixed inset-0 z-\[60\]/);
  });

  it("tagline: not italic on PACT; EN sentence case; SV wording unchanged", () => {
    expect(menuSrc).toMatch(/className=\{cn\(isDirtywineSite && "italic"\)\}/);
    expect(en.home.tagline).toBe("Producers and consumers together");
    expect(sv.home.tagline).toBe("Producenter och konsumenter tillsammans");
  });
});
