import { describe, expect, it } from "vitest";

import {
  AGE_LIMITS,
  DEFAULT_AGE_LIMIT,
  getAgeLimit,
  meetsAgeRequirement,
  resolveMarketAgeMinimum,
} from "@/lib/age-limits";
import { MINIMUM_AGE } from "@/lib/legal/age-check";

describe("age limits / markets.age_minimum", () => {
  it("uses the stricter (highest) known limit as DEFAULT_AGE_LIMIT", () => {
    const strictest = Math.max(...Object.values(AGE_LIMITS));
    expect(DEFAULT_AGE_LIMIT).toBe(strictest);
    expect(DEFAULT_AGE_LIMIT).toBe(21);
    expect(MINIMUM_AGE).toBe(DEFAULT_AGE_LIMIT);
  });

  it("Sweden stays at 20 from markets.age_minimum and country fallback", () => {
    expect(
      resolveMarketAgeMinimum({ countryCode: "SE", ageMinimum: 20 }),
    ).toBe(20);
    expect(
      resolveMarketAgeMinimum({ countryCode: "SE", ageMinimum: null }),
    ).toBe(20);
    expect(getAgeLimit("SE")).toBe(20);
  });

  it("Los Angeles / US market (age_minimum=21) requires 21 on client+server path", () => {
    // Same resolution checkout-client, payment-intent, and confirm use.
    expect(
      resolveMarketAgeMinimum({ countryCode: "US", ageMinimum: 21 }),
    ).toBe(21);
    expect(getAgeLimit("US")).toBe(21);
  });

  it("markets.age_minimum wins over a lower country table value", () => {
    expect(
      resolveMarketAgeMinimum({ countryCode: "SE", ageMinimum: 21 }),
    ).toBe(21);
  });

  it("missing market age falls back safely: known country, then stricter default", () => {
    expect(
      resolveMarketAgeMinimum({ countryCode: "US", ageMinimum: null }),
    ).toBe(21);
    expect(
      resolveMarketAgeMinimum({ countryCode: "US", ageMinimum: undefined }),
    ).toBe(21);
    expect(
      resolveMarketAgeMinimum({ countryCode: "SE", ageMinimum: null }),
    ).toBe(20);
    // Unknown / empty country → stricter of known values (21), never under-enforce.
    expect(
      resolveMarketAgeMinimum({ countryCode: "", ageMinimum: null }),
    ).toBe(DEFAULT_AGE_LIMIT);
    expect(
      resolveMarketAgeMinimum({ countryCode: "ZZ", ageMinimum: null }),
    ).toBe(DEFAULT_AGE_LIMIT);
    expect(
      resolveMarketAgeMinimum({ countryCode: "US", ageMinimum: 0 }),
    ).toBe(21);
    expect(
      resolveMarketAgeMinimum({ countryCode: "US", ageMinimum: NaN }),
    ).toBe(21);
  });

  it("rejects a 20-year-old under the US market age and accepts under Sweden", () => {
    const asOf = new Date(Date.UTC(2026, 7, 25));
    const dobTurning20 = "2006-08-25";
    expect(meetsAgeRequirement(dobTurning20, 20, asOf)).toBe(true);
    expect(meetsAgeRequirement(dobTurning20, 21, asOf)).toBe(false);
    expect(
      meetsAgeRequirement(
        dobTurning20,
        resolveMarketAgeMinimum({ countryCode: "US", ageMinimum: 21 }),
        asOf,
      ),
    ).toBe(false);
    expect(
      meetsAgeRequirement(
        dobTurning20,
        resolveMarketAgeMinimum({ countryCode: "SE", ageMinimum: 20 }),
        asOf,
      ),
    ).toBe(true);
  });
});
