import { describe, expect, it } from "vitest";
import { isGeoBotSuspect } from "@/lib/analytics/v2/geo-bot-rule";

describe("isGeoBotSuspect (Saga)", () => {
  const base = {
    countryCode: "CN",
    channel: "direct",
    hasReferrer: false,
    pageViews: 1,
    durationS: 5,
    hasGeoEngagement: false,
  };

  it("flags CN/SG/HK only with direct + no referrer + short + ≤1 PV + no engagement", () => {
    expect(isGeoBotSuspect(base)).toBe(true);
    expect(isGeoBotSuspect({ ...base, countryCode: "SG" })).toBe(true);
    expect(isGeoBotSuspect({ ...base, countryCode: "HK" })).toBe(true);
  });

  it("does not flag without the full Saga behavior set", () => {
    expect(isGeoBotSuspect({ ...base, channel: "organic" })).toBe(false);
    expect(isGeoBotSuspect({ ...base, hasReferrer: true })).toBe(false);
    expect(isGeoBotSuspect({ ...base, pageViews: 2 })).toBe(false);
    expect(isGeoBotSuspect({ ...base, durationS: 10 })).toBe(false);
    expect(isGeoBotSuspect({ ...base, hasGeoEngagement: true })).toBe(false);
    expect(isGeoBotSuspect({ ...base, countryCode: "SE" })).toBe(false);
  });

  it("allows duration under 10s and zero page views", () => {
    expect(isGeoBotSuspect({ ...base, durationS: 9, pageViews: 0 })).toBe(true);
  });
});
