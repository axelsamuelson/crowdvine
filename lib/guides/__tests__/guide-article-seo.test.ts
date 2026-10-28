import { describe, expect, it } from "vitest";

import { buyNaturalWineOnlineSwedenArticle } from "@/lib/guides/articles/buy-natural-wine-online-sweden";
import { naturalWineHomeDeliveryArticle } from "@/lib/guides/articles/natural-wine-home-delivery";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { bestNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-natural-wines-systembolaget";
import {
  articleGuideHreflang,
  buildArticleGuideMeta,
  isSwedenFirstGuideArticle,
} from "@/lib/guides/guide-article-seo";

describe("Sweden-first guide hreflang", () => {
  it("detects Systembolaget, Sweden-buying and home-delivery guides", () => {
    expect(isSwedenFirstGuideArticle(bestNaturalWinesSystembolagetArticle)).toBe(
      true,
    );
    expect(isSwedenFirstGuideArticle(buyNaturalWineOnlineSwedenArticle)).toBe(
      true,
    );
    expect(isSwedenFirstGuideArticle(naturalWineHomeDeliveryArticle)).toBe(
      true,
    );
    expect(isSwedenFirstGuideArticle(whatIsNaturalWineArticle)).toBe(false);
  });

  it("sets x-default to the Swedish URL for Sweden-first articles", () => {
    const languages = articleGuideHreflang(
      buyNaturalWineOnlineSwedenArticle,
      "https://pactwines.com",
      "sv",
    );
    expect(languages["x-default"]).toBe(languages.sv);
    expect(languages.sv).toContain("/guider/");
  });

  it("defaults buildArticleGuideMeta x-default to SV for Sweden-first guides", () => {
    const meta = buildArticleGuideMeta(
      buyNaturalWineOnlineSwedenArticle,
      "en",
      "https://pactwines.com",
      "PACT Wines",
    );
    const languages = meta.alternates?.languages as
      | Record<string, string>
      | undefined;
    expect(languages?.["x-default"]).toBe(languages?.sv);
  });

  it("keeps EN x-default for general bilingual guides", () => {
    const meta = buildArticleGuideMeta(
      whatIsNaturalWineArticle,
      "sv",
      "https://pactwines.com",
      "PACT Wines",
    );
    const languages = meta.alternates?.languages as
      | Record<string, string>
      | undefined;
    expect(languages?.["x-default"]).toBe(languages?.en);
  });
});
