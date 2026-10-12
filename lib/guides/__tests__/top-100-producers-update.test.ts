import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { entryDescription } from "@/lib/guides/guide-copy";
import {
  producerRankChange,
  rankChangePresentation,
} from "@/lib/guides/producer-rank-change";
import {
  formatTop100ProducersUpdatedDate,
  TOP_100_PRODUCERS,
  TOP_100_PRODUCERS_DEPARTED,
  TOP_100_PRODUCERS_UPDATED_AT,
} from "@/lib/guides/top-100-producers";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import {
  findTop100ProducerByNameOrAlias,
  findTop100ProducerExact,
} from "@/lib/mcp/utils/top-100-match";

const REMOVED = [
  "Gérard Gauby",
  "Descendientes de J. Palacios",
  "Stéphane Ogier",
];

describe("TOP_100_PRODUCERS update 2026-10-12", () => {
  it("keeps exactly ranks 1-100", () => {
    expect(TOP_100_PRODUCERS).toHaveLength(100);
    const ranks = TOP_100_PRODUCERS.map((producer) => producer.rank).sort(
      (a, b) => a - b,
    );
    expect(ranks).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(new Set(TOP_100_PRODUCERS.map((producer) => producer.name)).size).toBe(
      100,
    );
  });

  it("replaces the three producers with no wine link and keeps Bartolo", () => {
    const byRank = new Map(TOP_100_PRODUCERS.map((producer) => [producer.rank, producer]));
    expect(byRank.get(47)).toMatchObject({
      name: "Jean-Paul Thévenet",
      region: "Morgon, Beaujolais",
      country: "Frankrike",
      grapes: "Gamay",
      previousRank: null,
      description: null,
      descriptionEn: null,
    });
    expect(byRank.get(81)?.name).toBe(
      "Bartolo Mascarello / Maria Teresa Mascarello",
    );
    expect(byRank.get(81)?.previousRank).toBe(81);
    expect(byRank.get(87)).toMatchObject({
      name: "Catherine & Pierre Breton",
      region: "Bourgueil, Loire",
      country: "Frankrike",
      grapes: "Cabernet Franc, Chenin Blanc",
      previousRank: null,
      description: null,
      descriptionEn: null,
    });
    expect(byRank.get(97)).toMatchObject({
      name: "Alice & Olivier De Moor",
      region: "Chablis, Bourgogne",
      country: "Frankrike",
      grapes: "Chardonnay, Aligoté",
      previousRank: null,
      description: null,
      descriptionEn: null,
    });
    for (const name of REMOVED) {
      expect(TOP_100_PRODUCERS.some((producer) => producer.name === name)).toBe(
        false,
      );
    }
  });

  it("marks kept producers with previousRank equal to rank", () => {
    const newcomers = TOP_100_PRODUCERS.filter(
      (producer) => producer.previousRank == null,
    );
    expect(newcomers.map((producer) => producer.name).sort()).toEqual([
      "Alice & Olivier De Moor",
      "Catherine & Pierre Breton",
      "Jean-Paul Thévenet",
    ]);
    for (const producer of TOP_100_PRODUCERS) {
      if (producer.previousRank == null) continue;
      expect(producer.previousRank).toBe(producer.rank);
    }
  });

  it("resolves the Systembolaget Werlitsch name as an exact alias", () => {
    const legal = "Weingut Werlitsch - Tscheppe Ewald u. Brigitte";
    expect(findTop100ProducerExact(legal)).toBeNull();
    expect(findTop100ProducerByNameOrAlias(legal)).toMatchObject({
      rank: 56,
      name: "Werlitsch / Ewald Tscheppe",
    });
    expect(findTop100ProducerExact("Werlitsch / Ewald Tscheppe")?.rank).toBe(56);
  });

  it("lists only the producers that were actually removed", () => {
    expect(TOP_100_PRODUCERS_UPDATED_AT).toBe("2026-10-12");
    expect(formatTop100ProducersUpdatedDate("sv")).toBe("12 oktober 2026");
    expect(formatTop100ProducersUpdatedDate("en")).toBe("12 October 2026");
    expect(TOP_100_PRODUCERS_DEPARTED.map((row) => row.name)).toEqual(REMOVED);
    expect(
      TOP_100_PRODUCERS_DEPARTED.some((row) => row.name.includes("Mascarello")),
    ).toBe(false);
  });

  it("renders null descriptions as absent text", () => {
    const thevenet = TOP_100_PRODUCERS.find((producer) => producer.rank === 47);
    expect(entryDescription(thevenet!, "sv")).toBeUndefined();
    expect(entryDescription(thevenet!, "en")).toBeUndefined();
    expect(String(entryDescription(thevenet!, "sv"))).not.toBe("null");
  });

  it("describes movement with text, not color alone", () => {
    expect(producerRankChange({ rank: 10, previousRank: 13 })).toEqual({
      kind: "up",
      places: 3,
    });
    expect(producerRankChange({ rank: 12, previousRank: 10 })).toEqual({
      kind: "down",
      places: 2,
    });
    expect(producerRankChange({ rank: 4, previousRank: 4 }).kind).toBe("same");
    expect(producerRankChange({ rank: 47, previousRank: null }).kind).toBe("new");
    expect(rankChangePresentation({ kind: "up", places: 3 }, "sv")).toMatchObject({
      text: "▲ +3",
      ariaLabel: "Upp 3 placeringar",
    });
    expect(rankChangePresentation({ kind: "down", places: 2 }, "en")).toMatchObject({
      text: "▼ -2",
      ariaLabel: "Down 2 places",
    });
    expect(rankChangePresentation({ kind: "same" }, "sv").text).toBe("-");
    expect(rankChangePresentation({ kind: "new" }, "sv").text).toBe("NY");
    expect(rankChangePresentation({ kind: "new" }, "en").text).toBe("NEW");
  });

  it("keeps guide rank anchors aligned with unchanged producers", () => {
    const articlesDir = join(process.cwd(), "lib/guides/articles");
    const anchors: Array<[string, number, string]> = [
      ["pierre-overnoy.ts", 1, "Pierre Overnoy"],
      ["thierry-allemand.ts", 2, "Thierry Allemand"],
      ["josko-gravner.ts", 3, "Joško Gravner"],
      ["jean-francois-ganevat.ts", 4, "Jean-François Ganevat"],
      ["jacques-selosse.ts", 5, "Jacques Selosse"],
      ["radikon.ts", 8, "Radikon"],
      ["jean-foillard.ts", 10, "Jean Foillard"],
      ["marcel-lapierre.ts", 12, "Marcel Lapierre"],
      ["guy-breton.ts", 29, "Guy Breton"],
    ];
    for (const [file, rank, name] of anchors) {
      const source = readFileSync(join(articlesDir, file), "utf8");
      expect(source).toContain(`ranked #${rank}`);
      expect(source).toContain(`rankad #${rank}`);
      expect(
        TOP_100_PRODUCERS.find((producer) => producer.name.startsWith(name))
          ?.rank,
      ).toBe(rank);
    }
    const thevenet = readFileSync(
      join(articlesDir, "jean-paul-thevenet.ts"),
      "utf8",
    );
    expect(thevenet).not.toMatch(/rankad #\d+|ranked #\d+/i);
  });

  it("leaves Iago Bitarishvili as an unmatched wine without a list row", () => {
    const wine = TOP_100_WINES.find((row) => row.rank === 71);
    expect(wine).toMatchObject({
      wine: "Chinuri Pétillant Naturel",
      producer: "Iago Bitarishvili",
    });
    expect(wine?.topProducerName).toBeUndefined();
    expect(
      findTop100ProducerExact(wine?.producer ?? ""),
    ).toBeNull();
    expect(
      TOP_100_PRODUCERS.some((producer) =>
        producer.name.includes("Bitarishvili"),
      ),
    ).toBe(false);
  });
});
