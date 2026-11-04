import { describe, expect, it } from "vitest";

import { whatIsOrangeWineArticle } from "@/lib/guides/articles/what-is-orange-wine";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import { articleVisibleForLocale } from "@/lib/guides/guide-types";

describe("what is orange wine", () => {
  it("uses an absolute English title and the new H1", () => {
    const title = "What Is Orange Wine? Skin Contact Wine Explained";
    expect(whatIsOrangeWineArticle.title.en).toBe(title);
    expect(whatIsOrangeWineArticle.h1.en).toBe("What is orange wine?");
    expect(whatIsOrangeWineArticle.absoluteTitle).toEqual({ en: true });
    expect(whatIsOrangeWineArticle.updated).toBe("2026-11-04");
    expect(
      buildArticleGuideMeta(
        whatIsOrangeWineArticle,
        "en",
        "https://pactwines.com",
        "PACT Wines",
      ).title,
    ).toEqual({ absolute: title });
  });

  it("keeps the Swedish sections and only corrects the two dates", () => {
    expect(
      articleVisibleForLocale(whatIsOrangeWineArticle.sections, "sv").map(
        (section) => section.heading?.sv,
      ),
    ).toEqual([
      "Det enkla svaret",
      "Åtta tusen år gammal metod",
      "Hur orange vin görs",
      "Hur smakar orange vin?",
      "Joško Gravner och den moderna återfödelsen",
      "Vad passar orange vin till?",
      "Vanliga frågor om orange vin",
    ]);
    const gravner = articleVisibleForLocale(
      whatIsOrangeWineArticle.sections,
      "sv",
    ).find((section) => section.heading?.sv?.includes("Gravner"));
    const sv = Array.isArray(gravner?.body.sv)
      ? gravner.body.sv.join("\n")
      : (gravner?.body.sv ?? "");
    expect(sv).toContain("2000 reste Joško Gravner");
    expect(sv).not.toContain("1997");
    expect(sv).toContain("Stanko Radikon började med skalkontakt 1995, före Gravner");
    expect(sv).not.toContain("vid samma tid");
    expect(sv).toContain("Från 2001 började han vinifiera i qvevri");
  });

  it("dates Gravner to 2000 and names skin contact and amber wine in English", () => {
    const en = articleVisibleForLocale(whatIsOrangeWineArticle.sections, "en")
      .flatMap((section) =>
        Array.isArray(section.body.en) ? section.body.en : [section.body.en],
      )
      .join("\n");
    expect(en).toContain("travelled to Georgia in 2000");
    expect(en).toContain("skin-contact methods in 1995");
    expect(en).toContain("**amber wine**");
    expect(en).toContain("**Skin contact wine**");
    expect(en).not.toContain("1997");
    expect(en).not.toContain("most orange wine producers");
    expect(
      articleVisibleForLocale(whatIsOrangeWineArticle.faqs ?? [], "en").map(
        (faq) => faq.question.en,
      ),
    ).toHaveLength(6);
    expect(
      articleVisibleForLocale(whatIsOrangeWineArticle.faqs ?? [], "sv"),
    ).toHaveLength(0);
  });

  it("keeps the Systembolaget further-reading link on Swedish only", () => {
    const link = whatIsOrangeWineArticle.internalLinks.find((item) =>
      item.href.sv.includes("basta-orange-naturviner-systembolaget"),
    );
    expect(link?.label.en.trim()).toBe("");
    expect(link?.label.sv).toBe(
      "Bästa orange naturviner på Systembolaget →",
    );
  });
});
