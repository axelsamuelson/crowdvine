import { describe, expect, it } from "vitest";
import {
  buildCheckoutFunnelProperties,
  mapCheckoutStepToFunnelStep,
  postalPrefixFromRaw,
  uniqueIdList,
} from "@/lib/analytics/checkout-errors";

describe("postalPrefixFromRaw", () => {
  it("returns first 3 digits only", () => {
    expect(postalPrefixFromRaw("11458")).toBe("114");
    expect(postalPrefixFromRaw("114 58")).toBe("114");
    expect(postalPrefixFromRaw("12")).toBeNull();
    expect(postalPrefixFromRaw("")).toBeNull();
    expect(postalPrefixFromRaw(null)).toBeNull();
  });
});

describe("uniqueIdList", () => {
  it("dedupes and drops empties", () => {
    expect(uniqueIdList(["a", "a", "", null, "b", "  "])).toEqual(["a", "b"]);
  });
});

describe("mapCheckoutStepToFunnelStep", () => {
  it("maps internal steps/phases to CRO funnel steps only", () => {
    expect(mapCheckoutStepToFunnelStep("postal")).toBe("delivery");
    expect(mapCheckoutStepToFunnelStep("delivery")).toBe("delivery");
    expect(mapCheckoutStepToFunnelStep("age_terms")).toBe("terms");
    expect(mapCheckoutStepToFunnelStep("compliance")).toBe("terms");
    expect(mapCheckoutStepToFunnelStep("payment")).toBe("payment");
    expect(mapCheckoutStepToFunnelStep("confirm")).toBe("confirm");
    expect(mapCheckoutStepToFunnelStep("cart")).toBe("cart");
  });
});

describe("buildCheckoutFunnelProperties", () => {
  it("builds the CRO envelope without a full postcode", () => {
    const props = buildCheckoutFunnelProperties({
      errorCode: "no_pickup_for_cart",
      message: "Missing pickup",
      wineIds: ["w1", "w1"],
      producerIds: ["p1"],
      postalRaw: "11458",
      step: "delivery",
      sessionId: "sess-1",
      userId: "u1",
      visitorId: "v1",
      isInternal: true,
    });
    expect(props).toEqual({
      error_code: "no_pickup_for_cart",
      message: "Missing pickup",
      wine_ids: ["w1"],
      producer_ids: ["p1"],
      postal_prefix: "114",
      step: "delivery",
      session_id: "sess-1",
      user_id: "u1",
      visitor_id: "v1",
      is_internal: true,
    });
    expect(JSON.stringify(props)).not.toContain("11458");
  });
});
