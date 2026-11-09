import { describe, expect, it, vi } from "vitest";
import { validateEligibleGeoZoneId } from "@/lib/market/validate-eligible-geo-zone";
import { customerZoneSaveErrorMessage } from "@/lib/checkout/dual-offer-customer-copy";

function mockSb(row: Record<string, unknown> | null, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error }),
        }),
      }),
    }),
  } as never;
}

describe("validateEligibleGeoZoneId country-level zones", () => {
  it("allows active country-level zone (empty city) when country_code is set", async () => {
    const result = await validateEligibleGeoZoneId(
      mockSb({
        id: "gz1",
        is_active: true,
        eligibility_status: "open",
        city: null,
        country_code: "SE",
      }),
      "gz1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.countryLevel).toBe(true);
  });

  it("allows city-scoped zone", async () => {
    const result = await validateEligibleGeoZoneId(
      mockSb({
        id: "gz2",
        is_active: true,
        eligibility_status: "open",
        city: "Stockholm",
        country_code: "SE",
      }),
      "gz2",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.countryLevel).toBe(false);
  });

  it("rejects misconfigured zone missing country_code and logs", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await validateEligibleGeoZoneId(
      mockSb({
        id: "gz3",
        is_active: true,
        eligibility_status: "open",
        city: "",
        country_code: null,
      }),
      "gz3",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("geo_zone_misconfigured");
      expect(result.message).not.toMatch(/must include a city/i);
    }
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("still rejects inactive zones", async () => {
    const result = await validateEligibleGeoZoneId(
      mockSb({
        id: "gz4",
        is_active: false,
        eligibility_status: "open",
        city: "",
        country_code: "SE",
      }),
      "gz4",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("geo_zone_inactive");
  });
});

describe("customerZoneSaveErrorMessage", () => {
  it("maps raw English wine-zone city error to Swedish field copy", () => {
    const sv = customerZoneSaveErrorMessage(
      "Wine zone must include a city",
      "sv",
    );
    expect(sv).toMatch(/orten|leveransadressen|support/i);
    expect(sv).not.toMatch(/Wine zone/i);
  });

  it("maps misconfigured code text without exposing English machine string", () => {
    const sv = customerZoneSaveErrorMessage(
      "Wine zone is misconfigured",
      "sv",
    );
    expect(sv).not.toMatch(/misconfigured/i);
    expect(sv.length).toBeGreaterThan(10);
  });
});
