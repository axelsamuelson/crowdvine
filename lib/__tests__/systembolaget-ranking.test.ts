import { describe, expect, it } from "vitest";
import {
  blendScore,
  buildCuratedRanking,
  dedupeByProductNumber,
  mixRanking,
  orderCategoryWines,
  producerScore,
  rankingForView,
  type RankingSource,
} from "@/lib/systembolaget/ranking";

function scored(input: {
  productNumber: string;
  producerKey: string;
  score: number;
  sortOrder?: number;
}) {
  return {
    productNumber: input.productNumber,
    producerKey: input.producerKey,
    score: input.score,
    sortOrder: input.sortOrder ?? 0,
  };
}

function source(
  partial: Partial<RankingSource> &
    Pick<RankingSource, "productNumber" | "category">,
): RankingSource {
  return {
    name: partial.productNumber,
    verdict: "recommended",
    isPublished: true,
    wineScore: partial.wineScore ?? null,
    scoreAdjust: partial.scoreAdjust ?? 0,
    sortOrder: partial.sortOrder ?? 0,
    top100ProducerName: partial.top100ProducerName ?? null,
    producerName: partial.producerName ?? null,
    country: partial.country ?? "Frankrike",
    ...partial,
  };
}

describe("producerScore", () => {
  it("scores a top producer from rank and everyone else at 30", () => {
    expect(producerScore(1)).toBe(100);
    expect(producerScore(2)).toBeCloseTo(99.4);
    expect(producerScore(null)).toBe(30);
    expect(producerScore(500)).toBe(30);
  });

  it("blends producer points, wine score and the adjustment", () => {
    expect(blendScore(100, 80, -2)).toBeCloseTo(0.35 * 100 + 0.65 * 80 - 2);
  });
});

describe("mixRanking", () => {
  const radikon = [
    scored({ productNumber: "r93", producerKey: "Radikon", score: 93 }),
    scored({ productNumber: "r88", producerKey: "Radikon", score: 88 }),
    scored({ productNumber: "r84", producerKey: "Radikon", score: 84 }),
    scored({ productNumber: "n64", producerKey: "Nestarec", score: 64 }),
    scored({ productNumber: "a53", producerKey: "A", score: 53 }),
    scored({ productNumber: "b52", producerKey: "B", score: 52 }),
    scored({ productNumber: "c51", producerKey: "C", score: 51 }),
    scored({ productNumber: "d48", producerKey: "D", score: 48 }),
  ];

  it("separates Radikon and keeps at most two in the top five", () => {
    const order = mixRanking(radikon).map((wine) => wine.productNumber);
    expect(order).toEqual([
      "r93",
      "n64",
      "r88",
      "a53",
      "b52",
      "r84",
      "c51",
      "d48",
    ]);
    const topFive = order.slice(0, 5).filter((id) => id.startsWith("r"));
    expect(topFive).toHaveLength(2);
    for (let i = 1; i < order.length; i += 1) {
      const prev = radikon.find((wine) => wine.productNumber === order[i - 1]);
      const current = radikon.find((wine) => wine.productNumber === order[i]);
      expect(current?.producerKey).not.toBe(prev?.producerKey);
    }
  });

  it("keeps every wine and breaks ties by sort_order then product number", () => {
    const items = [
      scored({ productNumber: "b", producerKey: "P", score: 10, sortOrder: 2 }),
      scored({ productNumber: "a", producerKey: "Q", score: 10, sortOrder: 2 }),
      scored({ productNumber: "c", producerKey: "R", score: 10, sortOrder: 1 }),
    ];
    const order = mixRanking(items).map((wine) => wine.productNumber);
    expect(order).toEqual(["c", "a", "b"]);
    expect(new Set(order)).toEqual(
      new Set(items.map((wine) => wine.productNumber)),
    );
  });

  it("returns a single-producer list in score order when every gap is blocked", () => {
    const items = [
      scored({ productNumber: "1", producerKey: "Same", score: 3 }),
      scored({ productNumber: "2", producerKey: "Same", score: 2 }),
      scored({ productNumber: "3", producerKey: "Same", score: 1 }),
    ];
    expect(mixRanking(items).map((wine) => wine.productNumber)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });
});

describe("curated ranking", () => {
  it("keeps the incoming order when no wine has a score", () => {
    const wines = [
      {
        product_number: "2",
        wine_score: null,
        score_adjust: 0,
        sort_order: 2,
        producer_name: "B",
      },
      {
        product_number: "1",
        wine_score: null,
        score_adjust: 0,
        sort_order: 1,
        producer_name: "A",
      },
    ];
    expect(
      orderCategoryWines(wines).map((wine) => wine.product_number),
    ).toEqual(["2", "1"]);
  });

  it("places wines without wine_score after scored wines, in sort_order", () => {
    const wines = [
      {
        product_number: "late",
        wine_score: null,
        sort_order: 5,
        producer_name: "Late",
      },
      {
        product_number: "early",
        wine_score: null,
        sort_order: 1,
        producer_name: "Early",
      },
      {
        product_number: "scored",
        wine_score: 80,
        sort_order: 9,
        producer_name: "Scored",
      },
    ];
    expect(
      orderCategoryWines(wines).map((wine) => wine.product_number),
    ).toEqual(["scored", "early", "late"]);
  });

  it("dedupes a product that sits in more than one category", () => {
    const rows = [
      source({
        productNumber: "100",
        category: "red",
        wineScore: 70,
        sortOrder: 2,
        country: "Italien",
      }),
      source({
        productNumber: "100",
        category: "best",
        wineScore: 90,
        sortOrder: 1,
        country: "Italien",
      }),
      source({
        productNumber: "200",
        category: "white",
        wineScore: 40,
        country: "Frankrike",
      }),
    ];
    const ranked = buildCuratedRanking(rows);
    expect(ranked).toHaveLength(3);
    const global = rankingForView(ranked, "global");
    expect(global.map((row) => row.productNumber).sort()).toEqual([
      "100",
      "200",
    ]);
    expect(
      rankingForView(ranked, "category", { category: "red" }),
    ).toHaveLength(1);
    expect(
      rankingForView(ranked, "country", { country: "Italien" }),
    ).toHaveLength(1);
    const kept = dedupeByProductNumber(
      ranked.filter((row) => row.productNumber === "100"),
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]?.category).toBe("best");
    expect(new Set(global.map((row) => row.productNumber)).size).toBe(
      global.length,
    );
  });

  it("leaves avoid wines out and does not drop a recommended wine", () => {
    const rows = [
      source({ productNumber: "keep", category: "red", wineScore: 50 }),
      source({
        productNumber: "avoid",
        category: "red",
        verdict: "avoid",
        wineScore: 99,
      }),
      source({
        productNumber: "draft",
        category: "red",
        isPublished: false,
        wineScore: 99,
      }),
    ];
    const ranked = buildCuratedRanking(rows);
    expect(ranked.map((row) => row.productNumber)).toEqual(["keep"]);
  });
});

describe("petnat, glouglou, budget and best", () => {
  const categories = ["petnat", "glouglou", "budget", "best"] as const;

  function rowsFor(category: string) {
    return [
      {
        product_number: `${category}-alpha-next`,
        wine_score: 80 as number | null,
        score_adjust: 0,
        sort_order: 1,
        producer_name: `${category} Alpha`,
        price: 99,
      },
      {
        product_number: `${category}-beta`,
        wine_score: 70 as number | null,
        score_adjust: 0,
        sort_order: 2,
        producer_name: `${category} Beta`,
        price: 120,
      },
      {
        product_number: `${category}-alpha-high`,
        wine_score: 90 as number | null,
        score_adjust: 0,
        sort_order: 3,
        producer_name: `${category} Alpha`,
        price: 189,
      },
    ];
  }

  for (const category of categories) {
    it(`orders ${category} by categoryRank and keeps every row`, () => {
      const wines = rowsFor(category);
      const ordered = orderCategoryWines(wines);
      const ranked = buildCuratedRanking(
        wines.map((wine) =>
          source({
            productNumber: wine.product_number,
            category,
            wineScore: wine.wine_score,
            sortOrder: wine.sort_order,
            producerName: wine.producer_name,
          }),
        ),
      );
      const byCategoryRank = [...ranked]
        .sort((a, b) => a.categoryRank - b.categoryRank)
        .map((row) => row.productNumber);

      expect(ordered.map((wine) => wine.product_number)).toEqual(
        byCategoryRank,
      );
      expect(ordered.map((wine) => wine.product_number)).toEqual([
        `${category}-alpha-high`,
        `${category}-beta`,
        `${category}-alpha-next`,
      ]);
      expect(new Set(ordered.map((wine) => wine.product_number))).toEqual(
        new Set(wines.map((wine) => wine.product_number)),
      );
      expect(ordered).toHaveLength(wines.length);
    });

    it(`keeps the sort_order order for ${category} when no row has wine_score`, () => {
      const wines = rowsFor(category).map((wine) => ({
        ...wine,
        wine_score: null,
      }));
      expect(
        orderCategoryWines(wines).map((wine) => wine.product_number),
      ).toEqual(wines.map((wine) => wine.product_number));
    });
  }

  it("ranks best from the best rows, not from globalRank", () => {
    const best = [
      {
        product_number: "r93",
        wine_score: 93,
        score_adjust: 0,
        sort_order: 1,
        producer_name: "Radikon",
        top_100_producer_name: "Radikon",
      },
      {
        product_number: "r88",
        wine_score: 88,
        score_adjust: 0,
        sort_order: 2,
        producer_name: "Radikon",
        top_100_producer_name: "Radikon",
      },
      {
        product_number: "other",
        wine_score: 10,
        score_adjust: 0,
        sort_order: 3,
        producer_name: "Other",
        top_100_producer_name: null,
      },
    ];
    const ranked = buildCuratedRanking([
      ...best.map((wine) =>
        source({
          productNumber: wine.product_number,
          category: "best",
          wineScore: wine.wine_score,
          sortOrder: wine.sort_order,
          producerName: wine.producer_name,
          top100ProducerName: wine.top_100_producer_name,
        }),
      ),
      source({
        productNumber: "red-high",
        category: "red",
        wineScore: 99,
        sortOrder: 1,
        producerName: "Between",
      }),
      source({
        productNumber: "red-mid",
        category: "red",
        wineScore: 90,
        sortOrder: 2,
        producerName: "Between Two",
      }),
    ]);
    const categoryOrder = rankingForView(ranked, "category", {
      category: "best",
    }).map((row) => row.productNumber);
    const globalOrder = rankingForView(ranked, "global")
      .filter((row) =>
        best.some((wine) => wine.product_number === row.productNumber),
      )
      .map((row) => row.productNumber);

    expect(orderCategoryWines(best).map((wine) => wine.product_number)).toEqual(
      categoryOrder,
    );
    expect(categoryOrder).toEqual(["r93", "other", "r88"]);
    expect(globalOrder).not.toEqual(categoryOrder);
    expect(new Set(categoryOrder)).toEqual(
      new Set(best.map((wine) => wine.product_number)),
    );
  });

  it("does not use price when ranking budget", () => {
    const wines = [
      {
        product_number: "cheap-low",
        wine_score: 40,
        score_adjust: 0,
        sort_order: 1,
        producer_name: "Cheap",
        price: 89,
      },
      {
        product_number: "dear-high",
        wine_score: 90,
        score_adjust: 0,
        sort_order: 9,
        producer_name: "Dear",
        price: 199,
      },
    ];
    expect(
      orderCategoryWines(wines).map((wine) => wine.product_number),
    ).toEqual(["dear-high", "cheap-low"]);
  });
});
