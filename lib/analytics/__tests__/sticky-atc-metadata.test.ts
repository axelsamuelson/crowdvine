import { describe, expect, it } from "vitest";
import {
  buildStickyAtcMetadata,
  clampScrollDepth,
  stickyAtcViewportLabel,
} from "@/lib/analytics/sticky-atc-metadata";

describe("sticky ATC metadata helpers", () => {
  it("clamps scroll depth to 0–1", () => {
    expect(clampScrollDepth(-1)).toBe(0);
    expect(clampScrollDepth(0.5)).toBe(0.5);
    expect(clampScrollDepth(2)).toBe(1);
    expect(clampScrollDepth(Number.NaN)).toBe(0);
  });

  it("formats viewport as mobile/desktop plus width", () => {
    expect(stickyAtcViewportLabel(390, true)).toBe("mobile:390");
    expect(stickyAtcViewportLabel(1440, false)).toBe("desktop:1440");
  });

  it("builds Camille-required keys without PII fields", () => {
    const meta = buildStickyAtcMetadata({
      wineId: "w1",
      mainCtaHidden: true,
      scrollDepth: 0.25,
      widthPx: 390,
      isMobileLayout: true,
    });
    expect(meta).toEqual({
      main_cta_hidden: true,
      scroll_depth: 0.25,
      viewport: "mobile:390",
      wine_id: "w1",
    });
    expect(Object.keys(meta).sort()).toEqual([
      "main_cta_hidden",
      "scroll_depth",
      "viewport",
      "wine_id",
    ]);
  });
});
