import { describe, expect, it } from "vitest";
import { isGeoBotSuspect } from "@/lib/analytics/v2/geo-bot-rule";

describe("isGeoBotSuspect (v1.2)", () => {
  it("flags CN/SG/HK only with direct + short + few events + not engaged", () => {
    expect(
      isGeoBotSuspect({
        countryCode: "CN",
        channel: "direct",
        durationS: 0,
        events: 2,
        engaged: false,
      }),
    ).toBe(true);
    expect(
      isGeoBotSuspect({
        countryCode: "SG",
        channel: "direct",
        durationS: 0,
        events: 1,
        engaged: false,
      }),
    ).toBe(true);
    expect(
      isGeoBotSuspect({
        countryCode: "HK",
        channel: "direct",
        durationS: 0,
        events: 2,
        engaged: false,
      }),
    ).toBe(true);
  });

  it("does not flag a whole country without behavior signals", () => {
    expect(
      isGeoBotSuspect({
        countryCode: "CN",
        channel: "organic",
        durationS: 0,
        events: 2,
        engaged: false,
      }),
    ).toBe(false);
    expect(
      isGeoBotSuspect({
        countryCode: "CN",
        channel: "direct",
        durationS: 5,
        events: 2,
        engaged: false,
      }),
    ).toBe(false);
    expect(
      isGeoBotSuspect({
        countryCode: "CN",
        channel: "direct",
        durationS: 0,
        events: 10,
        engaged: false,
      }),
    ).toBe(false);
    expect(
      isGeoBotSuspect({
        countryCode: "CN",
        channel: "direct",
        durationS: 0,
        events: 2,
        engaged: true,
      }),
    ).toBe(false);
    expect(
      isGeoBotSuspect({
        countryCode: "SE",
        channel: "direct",
        durationS: 0,
        events: 2,
        engaged: false,
      }),
    ).toBe(false);
  });
});
