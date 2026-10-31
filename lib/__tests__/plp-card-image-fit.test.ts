import { describe, expect, it } from "vitest";
import {
  PLP_CARD_ASPECT,
  PLP_CONTAIN_IMAGE_BY_HANDLE,
  plpCardImageFit,
} from "@/lib/shop/plp-card-image";

describe("plpCardImageFit", () => {
  it("defaults to object-cover with no edge color", () => {
    expect(plpCardImageFit("l-2023")).toEqual({
      objectFit: "cover",
      edgeColor: null,
    });
  });

  it("keeps the contain override map empty until a wine clips height", () => {
    expect(PLP_CARD_ASPECT).toBeCloseTo(0.8);
    expect(Object.keys(PLP_CONTAIN_IMAGE_BY_HANDLE)).toHaveLength(0);
  });
});
