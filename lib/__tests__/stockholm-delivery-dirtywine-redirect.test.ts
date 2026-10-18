import { describe, expect, it } from "vitest";
import {
  isStockholmDeliveryRedirectPath,
  pactStockholmDeliveryRedirectUrl,
  STOCKHOLM_DELIVERY_SITEMAP_SLUGS,
} from "@/lib/stockholm-delivery-landing/dirtywine-redirect";

describe("dirtywine Stockholm delivery redirect", () => {
  it("matches SV and EN landing paths", () => {
    expect(
      isStockholmDeliveryRedirectPath("/vin/naturvin-hemleverans-stockholm"),
    ).toBe(true);
    expect(
      isStockholmDeliveryRedirectPath("/wine/natural-wine-delivery-stockholm"),
    ).toBe(true);
    expect(isStockholmDeliveryRedirectPath("/vin/rott-naturvin")).toBe(false);
  });

  it("builds absolute pact redirect URLs and preserves query", () => {
    expect(
      pactStockholmDeliveryRedirectUrl(
        "/vin/naturvin-hemleverans-stockholm",
        "?x=1",
      ),
    ).toBe(
      "https://pactwines.com/vin/naturvin-hemleverans-stockholm?x=1",
    );
  });

  it("exposes sitemap slugs to drop on dirtywine", () => {
    expect(STOCKHOLM_DELIVERY_SITEMAP_SLUGS.has("naturvin-hemleverans-stockholm")).toBe(
      true,
    );
    expect(
      STOCKHOLM_DELIVERY_SITEMAP_SLUGS.has("natural-wine-delivery-stockholm"),
    ).toBe(true);
  });
});
