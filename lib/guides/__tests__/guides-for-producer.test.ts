import { describe, expect, it } from "vitest";

import { guidesMentioningProducer } from "@/lib/guides/guides-for-producer";

describe("guidesMentioningProducer", () => {
  it("lists Foillard profile, top-100 and Beaujolais guides for jean-foillard", () => {
    const sv = guidesMentioningProducer("jean-foillard", "sv", {
      producerName: "Jean Foillard",
    });
    const hrefs = sv.map((guide) => guide.href);

    expect(hrefs).toContain("/guider/jean-foillard");
    expect(hrefs).toContain("/guider/varldens-basta-naturvinsproducenter");
    expect(hrefs).toContain("/guider/varldens-basta-naturviner");
    expect(hrefs).toContain("/guider/beaujolais-natural-wine");
    expect(sv.every((guide) => guide.title.trim().length > 0)).toBe(true);
  });

  it("returns English paths for the same producer", () => {
    const en = guidesMentioningProducer("jean-foillard", "en", {
      producerName: "Jean Foillard",
    });
    const hrefs = en.map((guide) => guide.href);

    expect(hrefs).toContain("/guides/jean-foillard");
    expect(hrefs).toContain("/guides/worlds-best-natural-wine-producers");
    expect(hrefs).toContain("/guides/beaujolais-natural-wine");
  });

  it("includes the organic comparison guide for Ugo Lestelle in English", () => {
    const en = guidesMentioningProducer("ugo-lestelle", "en", {
      producerName: "Ugo Lestelle",
    });
    expect(en.map((guide) => guide.href)).toContain(
      "/guides/natural-vs-organic-vs-biodynamic-wine",
    );
  });

  it("matches Domaine Jean Foillard via top-100 producerId", () => {
    const en = guidesMentioningProducer("domaine-jean-foillard", "en", {
      producerName: "Domaine Jean Foillard",
      producerId: "77606e79-786f-47d8-9d6a-3cf808c662c4",
    });
    const hrefs = en.map((guide) => guide.href);
    expect(hrefs).toContain("/guides/jean-foillard");
    expect(hrefs).toContain("/guides/worlds-best-natural-wine-producers");
    expect(hrefs).toContain("/guides/beaujolais-natural-wine");
  });
});
