import { describe, expect, it } from "vitest";

import { newNaturalWinesSystembolagetTitle } from "@/lib/guides/articles/new-natural-wines-systembolaget";
import { articlePath } from "@/lib/guides/guide-types";
import { newNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/new-natural-wines-systembolaget";
import { SYSTEMBOLAGET_RANKED_LISTS } from "@/lib/guides/systembolaget-list-links";
import {
  formatReleaseCardLabel,
  formatReleaseGroupHeading,
  formatReleaseUpdatedLabel,
  groupReleaseWines,
  isOrderAssortment,
  type ReleaseWine,
} from "@/lib/guides/systembolaget-release-groups";
import { GUIDE_WINE_CATEGORIES } from "@/lib/systembolaget/guide-wine-categories";

const TODAY = new Date("2026-10-28T12:00:00+01:00");

function wine(
  id: number,
  producer: string,
  launch: string | null,
  score: number | null = null,
  adjust = 0,
  assortment: string | null = "Tillfälligt sortiment",
  sortOrder?: number,
): ReleaseWine {
  return {
    id,
    producer_name: producer,
    product_launch_date: launch,
    wine_score: score,
    score_adjust: adjust,
    assortment_text: assortment,
    ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
  };
}

describe("Systembolaget release calendar", () => {
  it("keeps new out of the ranked lists", () => {
    expect(GUIDE_WINE_CATEGORIES).toContain("new");
    expect(SYSTEMBOLAGET_RANKED_LISTS.map((list) => list.category)).not.toContain(
      "new",
    );
    expect(
      articlePath(newNaturalWinesSystembolagetArticle, "sv"),
    ).toBe("/guider/nya-naturviner-systembolaget");
    expect(
      articlePath(newNaturalWinesSystembolagetArticle, "en"),
    ).toBe("/guides/new-natural-wines-systembolaget");
  });

  it("groups the 28 October calendar and ages October 30 into just released", () => {
    const rows = [
      wine(1, "Coulée de Serrant", "2026-10-30"),
      wine(2, "Ostertag", "2026-10-30T00:00:00.000Z"),
      wine(3, "Trebbiolo", "2026-11-06", 70),
      wine(4, "Joiseph", "2026-11-06", 80),
      wine(5, "Frontonio", "2026-11-06", 80),
      wine(6, "Quarticello", "2026-11-06", 60),
      wine(7, "Pietramore", "2026-11-13"),
      wine(8, "Older", "2026-08-28"),
      wine(9, "Boundary", "2026-08-29"),
      wine(10, "No date", null),
    ];

    const onThe28th = groupReleaseWines(rows, TODAY);
    expect(onThe28th.upcoming.map((group) => group.dateKey)).toEqual([
      "2026-10-30",
      "2026-11-06",
      "2026-11-13",
    ]);
    expect(onThe28th.upcoming[0]?.wines.map((row) => row.producer_name)).toEqual([
      "Coulée de Serrant",
      "Ostertag",
    ]);
    expect(onThe28th.upcoming[1]?.wines.map((row) => row.producer_name)).toEqual([
      "Frontonio",
      "Joiseph",
      "Trebbiolo",
      "Quarticello",
    ]);
    expect(onThe28th.upcoming[2]?.wines.map((row) => row.producer_name)).toEqual([
      "Pietramore",
    ]);
    expect(onThe28th.released.map((row) => row.wines.map((item) => item.id))).toEqual([
      [9],
    ]);
    expect(onThe28th.orderItems.map((row) => row.producer_name)).toEqual([
      "No date",
    ]);

    const onThe30th = groupReleaseWines(
      rows,
      new Date("2026-10-30T10:00:00+01:00"),
    );
    expect(onThe30th.upcoming.map((group) => group.dateKey)).toEqual([
      "2026-11-06",
      "2026-11-13",
    ]);
    expect(
      onThe30th.released.flatMap((group) => group.wines.map((row) => row.id)),
    ).toEqual([1, 2]);
  });

  it("puts Ordervaror and undated wines in orderItems (e.g. Superglitzer)", () => {
    expect(isOrderAssortment("Ordervaror")).toBe(true);
    expect(isOrderAssortment("Tillfälligt sortiment")).toBe(false);

    const calendar = groupReleaseWines(
      [
        wine(1, "Ostertag", "2026-10-30", null, 0, "Tillfälligt sortiment", 1),
        wine(
          2,
          "Superglitzer",
          "2026-11-02",
          null,
          0,
          "Ordervaror",
          3,
        ),
        wine(3, "Undated", null, null, 0, "Tillfälligt sortiment", 2),
      ],
      TODAY,
    );

    expect(calendar.orderItems.map((row) => row.producer_name)).toEqual([
      "Undated",
      "Superglitzer",
    ]);
    expect(calendar.upcoming.map((group) => group.dateKey)).toEqual([
      "2026-10-30",
    ]);
    expect(
      calendar.upcoming.flatMap((group) =>
        group.wines.map((row) => row.producer_name),
      ),
    ).toEqual(["Ostertag"]);
  });

  it("formats headings, card labels, and published-at updated line", () => {
    expect(formatReleaseGroupHeading("2026-11-06", "sv")).toBe(
      "Fredag 6 november",
    );
    expect(formatReleaseGroupHeading("2026-11-06", "en")).toBe(
      "Friday 6 November",
    );
    expect(formatReleaseCardLabel("2026-11-06", "sv", "upcoming")).toBe(
      "Släpps 6 nov",
    );
    expect(formatReleaseCardLabel("2026-11-06", "en", "upcoming")).toBe(
      "Out 6 Nov",
    );
    expect(formatReleaseCardLabel("2026-10-09", "sv", "released")).toBe(
      "Släpptes 9 okt",
    );
    expect(formatReleaseCardLabel("2026-10-09", "en", "released")).toBe(
      "Released 9 Oct",
    );
    expect(
      formatReleaseUpdatedLabel("2026-10-30T13:50:57.999Z", "sv"),
    ).toBe("Uppdaterad 30 oktober 2026");

    const title = newNaturalWinesSystembolagetTitle(TODAY);
    expect(title.sv).toBe(
      "Nya naturviner på Systembolaget: tillfälligt sortiment oktober 2026",
    );
    expect(title.en).toBe(
      "New natural wines at Systembolaget: October 2026 releases",
    );
  });

  it("does not mention Systembolaget prices in release-page copy", () => {
    const blob = [
      newNaturalWinesSystembolagetArticle.meta.sv,
      newNaturalWinesSystembolagetArticle.meta.en,
      newNaturalWinesSystembolagetArticle.hubCard.description.sv,
      newNaturalWinesSystembolagetArticle.hubCard.description.en,
      newNaturalWinesSystembolagetArticle.lede?.sv ?? "",
      newNaturalWinesSystembolagetArticle.lede?.en ?? "",
    ].join(" ");
    expect(blob.toLowerCase()).not.toMatch(/\bpris(er)?\b|\bprices?\b/);
  });
});
