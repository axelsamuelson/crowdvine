import { describe, expect, it } from "vitest";

import {
  PALLET_DELIVERY_ESTIMATE_LABEL,
  palletDeliveryEstimateLabel,
} from "@/lib/pallet-delivery-estimate-label";

describe("palletDeliveryEstimateLabel", () => {
  it("always returns the fixed 2–3 weeks copy (no fill-percent bands)", () => {
    expect(palletDeliveryEstimateLabel("sv")).toBe(
      "Levereras normalt 2–3 veckor efter att pallen stänger",
    );
    expect(palletDeliveryEstimateLabel("en")).toBe(
      "Delivered normally 2–3 weeks after the pallet closes",
    );
    expect(palletDeliveryEstimateLabel("sv")).toBe(
      PALLET_DELIVERY_ESTIMATE_LABEL.sv,
    );
    expect(palletDeliveryEstimateLabel()).toBe(
      PALLET_DELIVERY_ESTIMATE_LABEL.sv,
    );
  });

  it("does not mention shipping or skickas", () => {
    expect(PALLET_DELIVERY_ESTIMATE_LABEL.sv.toLowerCase()).not.toMatch(
      /skickas|shipping/,
    );
    expect(PALLET_DELIVERY_ESTIMATE_LABEL.en.toLowerCase()).not.toMatch(
      /skickas|shipping/,
    );
  });
});
