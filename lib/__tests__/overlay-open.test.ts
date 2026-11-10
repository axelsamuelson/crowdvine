import { describe, expect, it } from "vitest";
import {
  isOnScreenKeyboardOpen,
  setDocumentFlag,
  isDocumentFlagOpen,
  isMainCtaScrolledPast,
  splitTitleAndVintage,
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

  it("treats CTA as scrolled past only when above the viewport", () => {
    // Still below the fold (not intersecting, bottom > 0) — must NOT show sticky.
    expect(
      isMainCtaScrolledPast({
        isIntersecting: false,
        boundingClientRect: { top: 900, bottom: 944 } as DOMRectReadOnly,
      }),
    ).toBe(false);

    // Visible — must NOT show sticky.
    expect(
      isMainCtaScrolledPast({
        isIntersecting: true,
        boundingClientRect: { top: 400, bottom: 444 } as DOMRectReadOnly,
      }),
    ).toBe(false);

    // Scrolled past (above viewport) — show sticky.
    expect(
      isMainCtaScrolledPast({
        isIntersecting: false,
        boundingClientRect: { top: -80, bottom: -36 } as DOMRectReadOnly,
      }),
    ).toBe(true);
  });

  it("splits trailing vintage from wine titles", () => {
    expect(splitTitleAndVintage("Synthetic Résiste 2023")).toEqual({
      name: "Synthetic Résiste",
      vintage: "2023",
    });
    expect(
      splitTitleAndVintage(
        "Supercalifragilisticexpialidocious Cuvée Ancestrale 2020",
      ),
    ).toEqual({
      name: "Supercalifragilisticexpialidocious Cuvée Ancestrale",
      vintage: "2020",
    });
    expect(splitTitleAndVintage("No Year Wine")).toEqual({
      name: "No Year Wine",
      vintage: null,
    });
  });
});
