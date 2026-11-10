import { describe, expect, it } from "vitest";
import {
  isOnScreenKeyboardOpen,
  setDocumentFlag,
  isDocumentFlagOpen,
  CART_DRAWER_OPEN_ATTR,
} from "@/lib/pdp/overlay-open";

describe("overlay-open helpers", () => {
  it("toggles document flags on a stand-in element", () => {
    const root = { attrs: new Map<string, string>() } as unknown as HTMLElement;
    // Minimal HTMLElement-like surface for unit tests (no jsdom).
    const shim = {
      setAttribute(name: string, value: string) {
        (root as unknown as { attrs: Map<string, string> }).attrs.set(
          name,
          value,
        );
      },
      removeAttribute(name: string) {
        (root as unknown as { attrs: Map<string, string> }).attrs.delete(name);
      },
      getAttribute(name: string) {
        return (
          (root as unknown as { attrs: Map<string, string> }).attrs.get(name) ??
          null
        );
      },
    } as unknown as HTMLElement;

    setDocumentFlag(CART_DRAWER_OPEN_ATTR, true, shim);
    expect(isDocumentFlagOpen(CART_DRAWER_OPEN_ATTR, shim)).toBe(true);
    setDocumentFlag(CART_DRAWER_OPEN_ATTR, false, shim);
    expect(isDocumentFlagOpen(CART_DRAWER_OPEN_ATTR, shim)).toBe(false);
  });

  it("detects on-screen keyboard from visualViewport shrink", () => {
    expect(isOnScreenKeyboardOpen({ height: 400 }, 800)).toBe(true);
    expect(isOnScreenKeyboardOpen({ height: 750 }, 800)).toBe(false);
  });
});
