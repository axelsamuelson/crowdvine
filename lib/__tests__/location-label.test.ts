import { describe, expect, it } from "vitest";
import { locationLabelFromZone } from "@/lib/market/location-label";

describe("locationLabelFromZone", () => {
  it("localizes bare Sverige to Sweden in EN", () => {
    expect(locationLabelFromZone("Sverige", "SE", "en", "Select")).toBe(
      "Sweden",
    );
  });

  it("keeps Sverige in SV", () => {
    expect(locationLabelFromZone("Sverige", "SE", "sv", "Välj")).toBe(
      "Sverige",
    );
  });

  it("localizes the country segment of City, Sverige", () => {
    expect(
      locationLabelFromZone("Stockholm, Sverige", "SE", "en", "Select"),
    ).toBe("Stockholm, Sweden");
  });
});
