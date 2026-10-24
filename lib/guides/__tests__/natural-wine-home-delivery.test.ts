import { describe, expect, it } from "vitest";

import { naturalWineHomeDeliveryArticle } from "@/lib/guides/articles/natural-wine-home-delivery";
import {
  HOME_DELIVERY_GUIDE_PATH,
  resolveHomeDeliveryGuidePath,
} from "@/lib/guides/home-delivery-guide";
import { publishedBilingualArticleGuides } from "@/lib/guides/guide-publication";
import { articlePath, isGuideArticlePublished } from "@/lib/guides/guide-types";

describe("natural wine home delivery guide", () => {
  it("is published with the requested title, meta, h1 and paths", () => {
    expect(isGuideArticlePublished(naturalWineHomeDeliveryArticle)).toBe(true);
    expect(publishedBilingualArticleGuides()).toContain(
      naturalWineHomeDeliveryArticle,
    );
    expect(naturalWineHomeDeliveryArticle.title.sv).toBe(
      "Hemleverans av naturvin: så fungerar det",
    );
    expect(naturalWineHomeDeliveryArticle.title.en).toBe(
      "Natural Wine Home Delivery: How It Works",
    );
    expect(naturalWineHomeDeliveryArticle.h1.sv).toBe(
      "Så fungerar hemleverans av naturvin",
    );
    expect(naturalWineHomeDeliveryArticle.h1.en).toBe(
      "How Natural Wine Home Delivery Works",
    );
    expect(naturalWineHomeDeliveryArticle.meta.sv.length).toBeLessThan(160);
    expect(naturalWineHomeDeliveryArticle.meta.en.length).toBeLessThan(160);
    expect(naturalWineHomeDeliveryArticle.faqs).toBeUndefined();
    expect(articlePath(naturalWineHomeDeliveryArticle, "sv")).toBe(
      HOME_DELIVERY_GUIDE_PATH.sv,
    );
    expect(articlePath(naturalWineHomeDeliveryArticle, "en")).toBe(
      HOME_DELIVERY_GUIDE_PATH.en,
    );
  });

  it("maps legacy shop landings to the guide in one hop", () => {
    expect(
      resolveHomeDeliveryGuidePath("/vin/naturvin-hemleverans-stockholm"),
    ).toBe("/guider/hemleverans-av-naturvin");
    expect(
      resolveHomeDeliveryGuidePath("/wine/natural-wine-delivery-stockholm"),
    ).toBe("/guides/natural-wine-home-delivery");
  });

  it("has no FAQ and no em dashes", () => {
    expect(naturalWineHomeDeliveryArticle.faqs).toBeUndefined();
    const blobs = [
      naturalWineHomeDeliveryArticle.title.sv,
      naturalWineHomeDeliveryArticle.title.en,
      naturalWineHomeDeliveryArticle.meta.sv,
      naturalWineHomeDeliveryArticle.meta.en,
      naturalWineHomeDeliveryArticle.lede?.sv,
      naturalWineHomeDeliveryArticle.lede?.en,
      ...(naturalWineHomeDeliveryArticle.sections.flatMap((s) => [
        s.heading?.sv,
        s.heading?.en,
        ...(Array.isArray(s.body.sv) ? s.body.sv : [s.body.sv]),
        ...(Array.isArray(s.body.en) ? s.body.en : [s.body.en]),
      ])),
    ];
    for (const text of blobs) {
      expect(text).not.toMatch(/[—–]/);
    }
  });
});
