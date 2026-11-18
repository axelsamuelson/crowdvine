import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderArticleRichText } from "@/lib/guides/article-guide-shell";
import { bestPetNatWinesSystembolagetSvArticle } from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { whatIsPetNatArticle } from "@/lib/guides/articles/what-is-pet-nat";
import { buildArticleGuideMeta } from "@/lib/guides/guide-article-seo";
import { articleVisibleForLocale } from "@/lib/guides/guide-types";

const BASE = "https://pactwines.com";

function rendered(text: string): string {
  return renderToStaticMarkup(
    createElement("div", null, renderArticleRichText(text, "anchor")),
  );
}

function languagesOf(
  meta: ReturnType<typeof buildArticleGuideMeta>,
): Record<string, string> {
  return meta.alternates?.languages as Record<string, string>;
}

describe("pet nat query anchors", () => {
  it("keeps the Systembolaget explainer to three sentences and links pet nat", () => {
    const section = bestPetNatWinesSystembolagetSvArticle.sections.find(
      (item) => item.heading?.sv === "Vad är pét-nat?",
    );
    const paragraphs = section?.body.sv ?? [];
    expect(paragraphs).toEqual([
      "Pét-nat (pétillant naturel) är mousserande vin gjort med den äldsta metoden, méthode ancestrale. Vinet buteljeras innan första jäsningen är klar, och kolsyran bildas i flaskan av druvans eget socker – utan tillsatt jäst eller socker. Därför är pét-nat ofta lätt grumligt, med mjukare bubblor än champagne, och ibland med kvarvarande jästfällning i flaskan. Läs mer om vad [pet nat](/guider/vad-ar-pet-nat) är och hur det görs.",
    ]);
    expect(bestPetNatWinesSystembolagetSvArticle.lede?.sv).toBe(
      "Letar du efter pét-nat på Systembolaget? Här är vårt urval av pétillant naturel – mousserande vin där jäsningen avslutas i flaskan – från Loire, Alsace, Mosel, Sydtyrolen, Moravien, Chile med flera. Listan följer sortimentet och uppdateras när det ändras.",
    );
    expect(bestPetNatWinesSystembolagetSvArticle.lede?.sv).not.toContain("](");

    const html = rendered(paragraphs[0] ?? "");
    expect(html).toContain('href="/guider/vad-ar-pet-nat"');
    expect(html).toContain(">pet nat</a>");
    expect(html).not.toContain("nofollow");
    expect(html).not.toMatch(/href="https?:/);

    expect(bestPetNatWinesSystembolagetSvArticle.title.sv).toBe(
      "Bästa pet nat på Systembolaget – vårt urval | PACT",
    );
    expect(bestPetNatWinesSystembolagetSvArticle.h1.sv).toBe(
      "Bästa pet nat på Systembolaget 2026",
    );
    const meta = buildArticleGuideMeta(
      bestPetNatWinesSystembolagetSvArticle,
      "sv",
      BASE,
      "PACT Wines",
    );
    expect(meta.alternates?.canonical).toBe(
      `${BASE}/guider/basta-pet-nat-systembolaget`,
    );
    expect(languagesOf(meta)).toEqual({
      sv: `${BASE}/guider/basta-pet-nat-systembolaget`,
      en: `${BASE}/guides/best-pet-nat-systembolaget`,
      "x-default": `${BASE}/guider/basta-pet-nat-systembolaget`,
    });
    expect(section?.body.en[0]).toContain(
      "[What is pet nat?](/guides/what-is-pet-nat)",
    );
  });

  it("links pet nat på Systembolaget from the explainer without rewriting the sentence", () => {
    const section = articleVisibleForLocale(
      whatIsPetNatArticle.sections,
      "sv",
    ).find((item) => item.heading?.sv === "Vad du ska titta efter");
    const paragraph = section?.body.sv[2] ?? "";
    expect(paragraph).toBe(
      "På Systembolaget ligger flaskorna bland övriga mousserande viner. Rankningen finns i Bästa [pet nat på Systembolaget](/guider/basta-pet-nat-systembolaget) 2026. En bredare mousserande lista är [Bästa mousserande naturviner på Systembolaget](/guider/basta-mousserande-naturviner-systembolaget).",
    );
    const anchors = [
      ...paragraph.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g),
    ].filter((match) => match[2] === "/guider/basta-pet-nat-systembolaget");
    expect(anchors.map((match) => match[1])).toEqual([
      "pet nat på Systembolaget",
    ]);

    const html = rendered(paragraph);
    expect(html).toContain('href="/guider/basta-pet-nat-systembolaget"');
    expect(html).toContain(">pet nat på Systembolaget</a>");
    expect(html).toContain(">Bästa mousserande naturviner på Systembolaget</a>");
    expect(html).not.toContain("nofollow");
    expect(html).not.toMatch(/href="https?:/);
    expect(html).toContain("Rankningen finns i Bästa ");
    expect(html).toContain(" 2026.");

    expect(whatIsPetNatArticle.title.sv).toBe(
      "Vad är pet nat? Så görs pétillant naturel | PACT Wines",
    );
    expect(whatIsPetNatArticle.h1.sv).toBe("Vad är pet nat?");
    const meta = buildArticleGuideMeta(
      whatIsPetNatArticle,
      "sv",
      BASE,
      "PACT Wines",
    );
    expect(meta.alternates?.canonical).toBe(`${BASE}/guider/vad-ar-pet-nat`);
    expect(languagesOf(meta)).toEqual({
      sv: `${BASE}/guider/vad-ar-pet-nat`,
      en: `${BASE}/guides/what-is-pet-nat`,
      "x-default": `${BASE}/guides/what-is-pet-nat`,
    });
    expect(section?.body.en[2]).toContain(
      "[Best pet nat at Systembolaget 2026](/guides/best-pet-nat-systembolaget)",
    );
  });
});
