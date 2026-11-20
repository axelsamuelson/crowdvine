import { describe, expect, it } from "vitest";

import { isRecentProductLaunch } from "@/lib/systembolaget/is-recent-product-launch";

/** Fixed "now" at noon Stockholm on 2026-11-20 (CET, UTC+1). */
const NOON_STOCKHOLM = new Date("2026-11-20T12:00:00+01:00");

describe("isRecentProductLaunch", () => {
  it("returns false for null, undefined, empty, and unparseable dates", () => {
    expect(isRecentProductLaunch(null, NOON_STOCKHOLM)).toBe(false);
    expect(isRecentProductLaunch(undefined, NOON_STOCKHOLM)).toBe(false);
    expect(isRecentProductLaunch("", NOON_STOCKHOLM)).toBe(false);
    expect(isRecentProductLaunch("not-a-date", NOON_STOCKHOLM)).toBe(false);
  });

  it("includes today and future launch dates", () => {
    expect(isRecentProductLaunch("2026-11-20", NOON_STOCKHOLM)).toBe(true);
    expect(isRecentProductLaunch("2026-11-20T00:00:00.000Z", NOON_STOCKHOLM)).toBe(
      true,
    );
    expect(isRecentProductLaunch("2026-12-01T10:00:00.000Z", NOON_STOCKHOLM)).toBe(
      true,
    );
  });

  it("includes day 30 and excludes day 31", () => {
    // 20 Nov − 30 days = 21 Oct → still recent
    expect(isRecentProductLaunch("2026-10-21", NOON_STOCKHOLM)).toBe(true);
    expect(isRecentProductLaunch("2026-10-21T00:00:00.000Z", NOON_STOCKHOLM)).toBe(
      true,
    );
    // 20 Nov − 31 days = 20 Oct → expired
    expect(isRecentProductLaunch("2026-10-20", NOON_STOCKHOLM)).toBe(false);
    expect(isRecentProductLaunch("2026-10-20T00:00:00.000Z", NOON_STOCKHOLM)).toBe(
      false,
    );
  });

  it("uses Europe/Stockholm calendar days around midnight CET", () => {
    // Instant still 19 Nov UTC, but already 20 Nov 00:30 in Stockholm.
    const justAfterMidnightCet = new Date("2026-11-19T23:30:00.000Z");
    expect(isRecentProductLaunch("2026-10-21", justAfterMidnightCet)).toBe(true);
    expect(isRecentProductLaunch("2026-10-20", justAfterMidnightCet)).toBe(false);

    // Instant still 19 Nov 23:30 in Stockholm (CET = UTC+1).
    const justBeforeMidnightCet = new Date("2026-11-19T22:30:00.000Z");
    expect(isRecentProductLaunch("2026-10-20", justBeforeMidnightCet)).toBe(true);
    expect(isRecentProductLaunch("2026-10-19", justBeforeMidnightCet)).toBe(false);
  });

  it("treats a Stockholm-midnight instant as that Stockholm calendar day", () => {
    // 21 Oct 00:00 Stockholm = 20 Oct 23:00 UTC → day 30 from 20 Nov.
    expect(
      isRecentProductLaunch("2026-10-20T23:00:00.000Z", NOON_STOCKHOLM),
    ).toBe(true);
    // 20 Oct 00:00 Stockholm = 19 Oct 23:00 UTC → day 31 from 20 Nov.
    expect(
      isRecentProductLaunch("2026-10-19T23:00:00.000Z", NOON_STOCKHOLM),
    ).toBe(false);
  });
});
