import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: when the mobile menu is open, cart must not cover «Stäng»/Close.
 * Stacking (z-[60] above nav cart) + ≥44×44 Close hit area with aria-label.
 */
describe("mobile menu close stacking (PACT + Dirty Wine)", () => {
  const headerSrc = readFileSync(
    resolve(process.cwd(), "components/layout/header/index.tsx"),
    "utf8",
  );
  const menuSrc = readFileSync(
    resolve(process.cwd(), "components/layout/header/mobile-menu.tsx"),
    "utf8",
  );
  const sv = JSON.parse(
    readFileSync(resolve(process.cwd(), "messages/sv.json"), "utf8"),
  );
  const en = JSON.parse(
    readFileSync(resolve(process.cwd(), "messages/en.json"), "utf8"),
  );

  it("stacks the menu wrapper above the header cart for both brands", () => {
    expect(headerSrc).toMatch(/relative z-\[60\] block flex-none md:hidden/);
    // Old brand-gated wrapper (Dirty Wine z-60 / PACT z-10) must stay gone.
    expect(headerSrc).not.toMatch(
      /isDirtywineSite[\s\S]{0,80}\?[\s\S]{0,120}z-\[60\][\s\S]{0,120}:[\s\S]{0,120}z-10/,
    );
    expect(headerSrc).toMatch(/relative z-10 flex gap-2 justify-end/);
  });

  it("uses z-[60] on backdrop + panel (not PACT-only z-50)", () => {
    expect(menuSrc).toMatch(/fixed inset-0 z-\[60\] bg-foreground\/30/);
    expect(menuSrc).toMatch(/z-\[60\] flex w-full/);
    expect(menuSrc).not.toMatch(/fixed inset-0 z-50/);
    expect(menuSrc).not.toMatch(/p-modal-sides z-50/);
  });

  it("gives Close a ≥44×44 hit area, aria-label, and test id", () => {
    expect(menuSrc).toMatch(/data-testid="mobile-menu-close"/);
    expect(menuSrc).toMatch(/aria-label=\{t\("common\.closeMenu"\)\}/);
    expect(menuSrc).toMatch(/min-h-11/);
    expect(menuSrc).toMatch(/min-w-11/);
    expect(menuSrc).toMatch(/h-11/);
    expect(sv.common.closeMenu).toBe("Stäng meny");
    expect(en.common.closeMenu).toBe("Close menu");
    expect(sv.common.close).toBe("Stäng");
    expect(en.common.close).toBe("Close");
  });
});
