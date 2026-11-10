import { describe, expect, it } from "vitest";
import { confirmationSharedPalletCity } from "@/lib/reservations/confirmation-destination-label";

describe("confirmationSharedPalletCity", () => {
  it("extracts city from a Swedish delivery address", () => {
    expect(
      confirmationSharedPalletCity({
        deliveryAddress: "Testgatan 1, 11122 Stockholm, SE",
        deliveryZone: "Synthetic Stockholm Delivery",
      }),
    ).toBe("Stockholm");
  });

  it("falls back to cleaned zone name", () => {
    expect(
      confirmationSharedPalletCity({
        deliveryAddress: null,
        deliveryZone: "Synthetic Stockholm Delivery",
      }),
    ).toBe("Stockholm");
  });
});
