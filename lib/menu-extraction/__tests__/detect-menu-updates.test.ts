import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SitemapWinePlaceEntry } from "../sitemap-discovery";
import type { StarwinelistSource } from "../types";

vi.mock("../sitemap-discovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../sitemap-discovery")>();
  return {
    ...actual,
    fetchAllSitemapWinePlaceEntries: vi.fn(),
  };
});

vi.mock("../db", () => ({
  getStarwinelistSourceBySlug: vi.fn(),
  updateStarwinelistSource: vi.fn(),
}));

vi.mock("../detect-menu-updates-widget", () => ({
  runDetectMenuUpdatesFromWidget: vi.fn(),
}));

vi.mock("../pipeline-alerts", () => ({
  alertDetectMenuUpdatesDegenerateLastmod: vi.fn(),
  alertDetectMenuUpdatesFailure: vi.fn(),
  alertDetectMenuUpdatesNoLastmod: vi.fn(),
  alertDetectMenuUpdatesZeroWinePlaceUrls: vi.fn(),
}));

import { fetchAllSitemapWinePlaceEntries } from "../sitemap-discovery";
import { getStarwinelistSourceBySlug, updateStarwinelistSource } from "../db";
import { runDetectMenuUpdatesFromWidget } from "../detect-menu-updates-widget";
import { alertDetectMenuUpdatesDegenerateLastmod } from "../pipeline-alerts";
import {
  analyzeSitemapLastmodDegeneracy,
  runDetectMenuUpdates,
} from "../detect-menu-updates";

function sitemapEntry(slug: string, lastmod: string): SitemapWinePlaceEntry {
  return {
    slug,
    loc: `https://starwinelist.com/wine-place/${slug}`,
    lastmod,
    lastmod_parsed: new Date(lastmod).toISOString(),
  };
}

function mockSource(slug: string): StarwinelistSource {
  return {
    id: `id-${slug}`,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    slug,
    name: slug,
    city: "stockholm",
    source_url: `https://starwinelist.com/wine-place/${slug}`,
    swl_updated_at: null,
    swl_updated_at_parsed: null,
    sitemap_lastmod: null,
    pdf_url: null,
    pdf_last_seen_at: null,
    crawl_status: "completed",
    last_crawled_at: null,
    last_checked_at: null,
    last_error: null,
    crawl_attempts: 0,
    crawl_priority: 0,
    latest_document_id: null,
  };
}

describe("analyzeSitemapLastmodDegeneracy", () => {
  it("flags uniform-date sitemaps above threshold", () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      sitemapEntry(`venue-${i}`, "2026-06-15"),
    );
    const result = analyzeSitemapLastmodDegeneracy(entries, 0.8);
    expect(result.degenerate).toBe(true);
    expect(result.modeDate).toBe("2026-06-15");
    expect(result.share).toBe(1);
  });

  it("allows mixed-date sitemaps below threshold", () => {
    const entries = [
      ...Array.from({ length: 5 }, (_, i) =>
        sitemapEntry(`a-${i}`, "2026-06-15"),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        sitemapEntry(`b-${i}`, "2026-06-16"),
      ),
    ];
    const result = analyzeSitemapLastmodDegeneracy(entries, 0.8);
    expect(result.degenerate).toBe(false);
    expect(result.share).toBe(0.5);
  });
});

describe("runDetectMenuUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runDetectMenuUpdatesFromWidget).mockResolvedValue({
      widget_entries: 2,
      matched: 1,
      priority_boosted: 1,
      unmatched_names: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uniform-date sitemap → widget primary, snapshots recorded, no sitemap boosts", async () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      sitemapEntry(`venue-${i}`, "2026-06-15"),
    );
    vi.mocked(fetchAllSitemapWinePlaceEntries).mockResolvedValue(entries);
    vi.mocked(getStarwinelistSourceBySlug).mockImplementation(async (slug) =>
      slug === "venue-0" ? mockSource(slug) : null,
    );

    const summary = await runDetectMenuUpdates("stockholm");

    expect(summary.mode).toBe("combined");
    expect(summary.sitemap_lastmod_degenerate).toBe(true);
    expect(summary.widget_priority_boosted).toBe(1);
    expect(summary.sitemap_priority_boosted).toBe(0);
    expect(summary.priority_boosted).toBe(1);
    expect(summary.sitemap_lastmods_recorded).toBe(1);
    expect(runDetectMenuUpdatesFromWidget).toHaveBeenCalledWith("stockholm");
    expect(fetchAllSitemapWinePlaceEntries).toHaveBeenCalled();
    const widgetOrder = vi.mocked(runDetectMenuUpdatesFromWidget).mock
      .invocationCallOrder[0];
    const sitemapOrder = vi.mocked(fetchAllSitemapWinePlaceEntries).mock
      .invocationCallOrder[0];
    expect(widgetOrder).toBeLessThan(sitemapOrder);
    expect(alertDetectMenuUpdatesDegenerateLastmod).toHaveBeenCalledWith(
      100,
      "2026-06-15",
    );
    expect(updateStarwinelistSource).toHaveBeenCalledWith("id-venue-0", {
      sitemap_lastmod: "2026-06-15",
    });
    expect(updateStarwinelistSource).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ crawl_priority: 100 }),
    );
  });

  it("mixed-date sitemap → widget + sitemap boosts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T10:00:00.000Z"));

    const entries = [
      sitemapEntry("brasserie-elverket", "2026-06-16"),
      sitemapEntry("spritmuseum", "2026-06-15"),
      sitemapEntry("operakallaren", "2026-06-14"),
      sitemapEntry("sturehof", "2026-06-13"),
      sitemapEntry("riche", "2026-06-12"),
    ];
    vi.mocked(fetchAllSitemapWinePlaceEntries).mockResolvedValue(entries);
    vi.mocked(getStarwinelistSourceBySlug).mockImplementation(async (slug) => {
      const base = mockSource(slug);
      if (slug === "brasserie-elverket") {
        return {
          ...base,
          last_checked_at: "2026-06-15T12:00:00.000Z",
        };
      }
      return {
        ...base,
        last_checked_at: "2026-06-20T12:00:00.000Z",
      };
    });

    const summary = await runDetectMenuUpdates("stockholm");

    expect(summary.mode).toBe("combined");
    expect(summary.sitemap_lastmod_degenerate).toBe(false);
    expect(summary.widget_priority_boosted).toBe(1);
    expect(summary.sitemap_priority_boosted).toBe(1);
    expect(summary.priority_boosted).toBe(2);
    expect(summary.sitemap_lastmods_recorded).toBe(5);
    expect(alertDetectMenuUpdatesDegenerateLastmod).not.toHaveBeenCalled();
    expect(runDetectMenuUpdatesFromWidget).toHaveBeenCalledWith("stockholm");
    expect(updateStarwinelistSource).toHaveBeenCalledWith("id-brasserie-elverket", {
      crawl_priority: 100,
      crawl_attempts: 0,
    });
  });
});
