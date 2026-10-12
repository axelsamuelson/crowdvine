import { describe, expect, it } from "vitest";

import { SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK } from "@/lib/guides/systembolaget-producer-availability";
import {
  isMixBoxProduct,
  ranksForProducerName,
  suggestCuratedCategoryFromLevel2,
} from "@/lib/systembolaget/top-producer-coverage";

describe("top producer coverage helpers", () => {
  it("maps Nestarec only to rank 78 via the static table", () => {
    expect(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK[78]).toEqual([
      "Milan Nestarec",
    ]);
    expect(ranksForProducerName("Milan Nestarec")).toEqual([78]);
    expect(ranksForProducerName("Château Haut Breton Larigaudière")).toEqual(
      [],
    );
  });

  it("suggests curated categories from Systembolaget style labels", () => {
    expect(suggestCuratedCategoryFromLevel2("Rött vin")).toBe("red");
    expect(suggestCuratedCategoryFromLevel2("Vitt vin")).toBe("white");
    expect(suggestCuratedCategoryFromLevel2("Orange vin")).toBe("orange");
    expect(suggestCuratedCategoryFromLevel2("Mousserande vin")).toBe(
      "sparkling",
    );
    expect(suggestCuratedCategoryFromLevel2("Rosévin")).toBe("rose");
    expect(suggestCuratedCategoryFromLevel2("Vinlåda")).toBeNull();
  });

  it("detects mix boxes such as Vinstereo and Mixtape", () => {
    expect(
      isMixBoxProduct({
        categoryLevel2: "Vinlåda",
        nameBold: "Gut Oggau",
        nameThin: "Vinstereo",
      }),
    ).toBe(true);
    expect(
      isMixBoxProduct({
        categoryLevel2: "Rött vin",
        nameBold: "Christian Tschida",
        nameThin: "Mixtape",
      }),
    ).toBe(true);
    expect(
      isMixBoxProduct({
        categoryLevel2: "Orange vin",
        nameBold: "TRBLMKR",
        nameThin: "Milan Nestarec",
      }),
    ).toBe(false);
  });
});
