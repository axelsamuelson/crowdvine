import { describe, expect, it } from "vitest";
import {
  isShopFullBleedPath,
  isStockholmDeliveryLandingPath,
  isStockholmDeliveryLandingSlug,
  stockholmDeliveryLandingCopy,
  STOCKHOLM_DELIVERY_PATH,
} from "@/lib/stockholm-delivery-landing/config";

describe("stockholm delivery landing config", () => {
  it("recognizes SV and EN paths and slugs", () => {
    expect(isStockholmDeliveryLandingPath(STOCKHOLM_DELIVERY_PATH.sv)).toBe(
      true,
    );
    expect(isStockholmDeliveryLandingPath(STOCKHOLM_DELIVERY_PATH.en)).toBe(
      true,
    );
    expect(isStockholmDeliveryLandingPath("/vin/rott-naturvin")).toBe(false);
    expect(isStockholmDeliveryLandingSlug("naturvin-hemleverans-stockholm", "sv")).toBe(
      true,
    );
    expect(
      isStockholmDeliveryLandingSlug("natural-wine-delivery-stockholm", "en"),
    ).toBe(true);
    expect(isStockholmDeliveryLandingSlug("rott-naturvin", "sv")).toBe(false);
  });

  it("marks the landing as full-bleed shop chrome", () => {
    expect(isShopFullBleedPath(STOCKHOLM_DELIVERY_PATH.sv)).toBe(true);
    expect(isShopFullBleedPath("/vin")).toBe(false);
  });

  it("uses restaurant-oriented copy on dirtywine", () => {
    const dirty = stockholmDeliveryLandingCopy("sv", true);
    const pact = stockholmDeliveryLandingCopy("sv", false);
    expect(dirty.brand).toBe("Dirty Wine");
    expect(dirty.h1).toMatch(/restaurang/i);
    expect(pact.brand).toBe("PACT");
    expect(pact.h1).toMatch(/hemleverans/i);
  });
});
