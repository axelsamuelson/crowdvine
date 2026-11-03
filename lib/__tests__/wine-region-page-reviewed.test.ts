import { describe, expect, it } from "vitest";

import {
  WINE_REGION_PAGE_REVIEWED_AT,
  formatWineRegionReviewedDate,
  wineRegionReviewedByline,
} from "@/lib/wine-region-page-reviewed";

describe("wine region reviewed byline", () => {
  it("uses a stable ISO date for dateModified", () => {
    expect(WINE_REGION_PAGE_REVIEWED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("formats visible bylines", () => {
    expect(wineRegionReviewedByline("sv")).toMatch(/^Senast granskad /);
    expect(wineRegionReviewedByline("en")).toMatch(/^Last reviewed /);
    expect(formatWineRegionReviewedDate("sv")).toContain("2026");
    expect(formatWineRegionReviewedDate("en")).toContain("2026");
  });
});
