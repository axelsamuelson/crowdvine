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
});
