import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("cart drawer stacks above header MENY", () => {
  it("portals the open drawer to document.body at z-[70]", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/cart/modal.tsx"),
      "utf8",
    );
    expect(src).toMatch(/createPortal/);
    expect(src).toMatch(/document\.body/);
    expect(src).toMatch(/z-\[70\]/);
    expect(src).toMatch(/data-testid="cart-drawer-panel"/);
  });

  it("locks body scroll, closes on Escape/backdrop, and traps/restores focus", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/cart/modal.tsx"),
      "utf8",
    );
    expect(src).toMatch(/useBodyScrollLock\(isOpen\)/);
    expect(src).toMatch(/event\.key === ["']Escape["']/);
    expect(src).toMatch(/data-testid="cart-drawer-backdrop"/);
    expect(src).toMatch(/aria-modal="true"/);
    expect(src).toMatch(/triggerRef/);
    expect(src).toMatch(/getFocusable|focusableSelector/);
    expect(src).toMatch(/restoreTo|triggerRef\.current/);
  });
});
