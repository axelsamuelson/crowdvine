import { describe, expect, it } from "vitest";
import {
  PLP_CARD_ASPECT,
  PLP_CONTAIN_IMAGE_BY_HANDLE,
  plpCardImageFit,
} from "@/lib/shop/plp-card-image";

describe("plpCardImageFit", () => {
  it("uses contain + edge color for audited square shop labels", () => {
    const fit = plpCardImageFit("l-2023");
    expect(fit.objectFit).toBe("contain");
    expect(fit.edgeColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("falls back to cover for unknown handles", () => {
    expect(plpCardImageFit("not-a-real-wine-handle-xyz")).toEqual({
      objectFit: "cover",
      edgeColor: null,
    });
  });

  it("keeps the 4/5 aspect constant and a full override map", () => {
    expect(PLP_CARD_ASPECT).toBeCloseTo(0.8);
    expect(Object.keys(PLP_CONTAIN_IMAGE_BY_HANDLE).length).toBeGreaterThan(80);
  });
});
