import { describe, expect, it } from "vitest";
import {
  isPlpTouchUi,
  isTapGesture,
  shouldInterceptPlpCardTap,
} from "@/lib/plp/commerce-box-touch";

function media(map: Record<string, boolean>) {
  return (query: string) => ({ matches: Boolean(map[query]) });
}

describe("plp commerce box touch helpers", () => {
  it("treats hover:none or pointer:coarse as touch UI", () => {
    expect(
      isPlpTouchUi(
        media({ "(hover: none)": true, "(pointer: coarse)": false }),
      ),
    ).toBe(true);
    expect(
      isPlpTouchUi(
        media({ "(hover: none)": false, "(pointer: coarse)": true }),
      ),
    ).toBe(true);
    expect(
      isPlpTouchUi(
        media({ "(hover: none)": false, "(pointer: coarse)": false }),
      ),
    ).toBe(false);
  });

  it("latches touch UI once a touch has been seen even if media lies", () => {
    expect(
      isPlpTouchUi(
        media({ "(hover: none)": false, "(pointer: coarse)": false }),
        true,
      ),
    ).toBe(true);
  });

  it("intercepts only the first tap on touch UI", () => {
    expect(
      shouldInterceptPlpCardTap({ isTouchUi: true, isRevealed: false }),
    ).toBe(true);
    expect(
      shouldInterceptPlpCardTap({ isTouchUi: true, isRevealed: true }),
    ).toBe(false);
    expect(
      shouldInterceptPlpCardTap({ isTouchUi: false, isRevealed: false }),
    ).toBe(false);
  });

  it("distinguishes taps from scrolls", () => {
    expect(isTapGesture({ x: 10, y: 10 }, { x: 12, y: 11 })).toBe(true);
    expect(isTapGesture({ x: 10, y: 10 }, { x: 10, y: 40 })).toBe(false);
    expect(isTapGesture(null, { x: 0, y: 0 })).toBe(true);
  });
});
