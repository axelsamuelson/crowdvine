import { describe, expect, it } from "vitest";
import {
  ANALYTICS_V2_EARLIEST,
  defaultDateRange,
  inclusiveDayCount,
  parseAnalyticsV2Filters,
  toQueryString,
} from "@/lib/analytics/v2/filters";

describe("parseAnalyticsV2Filters", () => {
  it("defaults site to pact and never all", () => {
    expect(parseAnalyticsV2Filters(new URLSearchParams()).site).toBe("pact");
    expect(
      parseAnalyticsV2Filters(new URLSearchParams("site=all")).site,
    ).toBe("pact");
    expect(
      parseAnalyticsV2Filters(new URLSearchParams("site=dirtywine")).site,
    ).toBe("dirtywine");
  });

  it("clamps earliest date to 2026-08-07", () => {
    const f = parseAnalyticsV2Filters(
      new URLSearchParams("from=2026-01-01&to=2026-08-10"),
    );
    expect(f.from).toBe(ANALYTICS_V2_EARLIEST);
  });

  it("defaults grain to week for ≥28 days else day", () => {
    const long = parseAnalyticsV2Filters(
      new URLSearchParams("from=2026-10-01&to=2026-10-28"),
    );
    expect(inclusiveDayCount(long.from, long.to)).toBe(28);
    expect(long.grain).toBe("week");

    const short = parseAnalyticsV2Filters(
      new URLSearchParams("from=2026-10-01&to=2026-10-07"),
    );
    expect(short.grain).toBe("day");
  });

  it("parses invited / market / compare", () => {
    const f = parseAnalyticsV2Filters(
      new URLSearchParams(
        "invited=exclude&market=SE&compare=mom&channel=organic&device=mobile",
      ),
    );
    expect(f.invited).toBe("exclude");
    expect(f.market).toBe("SE");
    expect(f.compare).toBe("mom");
    expect(f.channel).toBe("organic");
    expect(f.device).toBe("mobile");
  });

  it("round-trips via toQueryString", () => {
    const f = parseAnalyticsV2Filters(
      new URLSearchParams(
        "site=dirtywine&from=2026-10-01&to=2026-10-14&grain=day&invited=only&compare=none",
      ),
    );
    const again = parseAnalyticsV2Filters(new URLSearchParams(toQueryString(f)));
    expect(again.site).toBe("dirtywine");
    expect(again.from).toBe("2026-10-01");
    expect(again.to).toBe("2026-10-14");
    expect(again.grain).toBe("day");
    expect(again.invited).toBe("only");
    expect(again.compare).toBe("none");
  });
});

describe("defaultDateRange", () => {
  it("returns 28 Stockholm days ending on the given instant", () => {
    // 2026-11-19 12:00 Stockholm ≈ 2026-11-19T11:00:00Z (CET)
    const { from, to } = defaultDateRange(
      28,
      new Date("2026-11-19T11:00:00.000Z"),
    );
    expect(to).toBe("2026-11-19");
    expect(from).toBe("2026-10-23");
    expect(inclusiveDayCount(from, to)).toBe(28);
  });
});
