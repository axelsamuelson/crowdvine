import { describe, expect, it } from "vitest";

import { bestPetNatWinesSystembolagetSvArticle } from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { whatIsPetNatArticle } from "@/lib/guides/articles/what-is-pet-nat";
import {
  buildGuideAuthorPersonJsonLd,
  buildGuideFaqPageJsonLd,
  countJsonLdType,
  guideArticleAuthorRef,
  guideAuthorPersonId,
  parseJsonLdScripts,
} from "@/lib/guides/guide-json-ld";
import {
  articleLinkText,
  articleVisibleForLocale,
} from "@/lib/guides/guide-types";

const SEO_BASE = "https://pactwines.com";

function scriptsHtml(documents: Record<string, unknown>[]): string {
  return documents
    .map(
      (doc) =>
        `<script type="application/ld+json">${JSON.stringify(doc)}</script>`,
    )
    .join("\n");
}

describe("buildGuideAuthorPersonJsonLd", () => {
  it("emits a Person with @id, name, jobTitle and worksFor — no invented url/sameAs", () => {
    const author = bestPetNatWinesSystembolagetSvArticle.author!;
    const person = buildGuideAuthorPersonJsonLd(author, SEO_BASE);

    expect(person["@context"]).toBe("https://schema.org");
    expect(person["@type"]).toBe("Person");
    expect(person["@id"]).toBe(
      `${SEO_BASE}/#/schema/person/axel-samuelson`,
    );
    expect(person.name).toBe("Axel Samuelson");
    expect(person.jobTitle).toBe("Grundare av PACT");
    expect(person).not.toHaveProperty("url");
    expect(person).not.toHaveProperty("sameAs");
    expect(person.worksFor).toEqual({
      "@type": "Organization",
      name: "PACT",
      url: SEO_BASE,
    });
  });

  it("includes url and sameAs only when present on the author object", () => {
    const person = buildGuideAuthorPersonJsonLd(
      {
        name: "Axel Samuelson",
        url: "https://pactwines.com/om",
        sameAs: ["https://www.instagram.com/pactwines"],
      },
      SEO_BASE,
    );

    expect(person.url).toBe("https://pactwines.com/om");
    expect(person.sameAs).toEqual([
      "https://www.instagram.com/pactwines",
    ]);
  });

  it("links Article.author by @id without nesting a second Person", () => {
    const personId = guideAuthorPersonId("Axel Samuelson", SEO_BASE);
    const article = {
      "@context": "https://schema.org",
      "@type": "Article",
      author: guideArticleAuthorRef(personId),
    };
    const person = buildGuideAuthorPersonJsonLd(
      { name: "Axel Samuelson" },
      SEO_BASE,
    );
    const parsed = parseJsonLdScripts(scriptsHtml([article, person]));

    expect(countJsonLdType(parsed, "Article")).toBe(1);
    expect(countJsonLdType(parsed, "Person")).toBe(1);
    expect(countJsonLdType(parsed, "BreadcrumbList")).toBe(0);

    const articleNode = parsed[0] as {
      author: { "@id": string };
    };
    expect(articleNode.author).toEqual({ "@id": personId });
    expect(articleNode.author).not.toHaveProperty("@type");
  });
});

describe("buildGuideFaqPageJsonLd", () => {
  it("returns null when there are no FAQs", () => {
    expect(buildGuideFaqPageJsonLd([])).toBeNull();
  });

  it("mirrors visible FAQ text and strips markdown link URLs", () => {
    const svFaqs = articleVisibleForLocale(
      whatIsNaturalWineArticle.faqs ?? [],
      "sv",
    ).map((faq) => ({
      question: faq.question.sv,
      answer: faq.answer.sv,
    }));

    const faqPage = buildGuideFaqPageJsonLd(svFaqs);
    expect(faqPage).not.toBeNull();
    expect(faqPage!["@type"]).toBe("FAQPage");

    const mainEntity = faqPage!.mainEntity as Array<{
      "@type": string;
      name: string;
      acceptedAnswer: { "@type": string; text: string };
    }>;
    expect(mainEntity.length).toBe(svFaqs.length);

    const orangeFaq = mainEntity.find((item) =>
      item.name.includes("orange vin"),
    );
    expect(orangeFaq).toBeDefined();
    expect(orangeFaq!.acceptedAnswer.text).toBe(
      articleLinkText(
        svFaqs.find((f) => f.question.includes("orange vin"))!.answer,
      ),
    );
    expect(orangeFaq!.acceptedAnswer.text).toContain("Vad är orange vin?");
    expect(orangeFaq!.acceptedAnswer.text).not.toContain("/guider/");
    expect(orangeFaq!.acceptedAnswer.text).not.toMatch(/\]\(/);
  });

  it("parses pet-nat FAQPage JSON-LD without duplicating Article or BreadcrumbList", () => {
    const svFaqs = articleVisibleForLocale(
      bestPetNatWinesSystembolagetSvArticle.faqs ?? [],
      "sv",
    ).map((faq) => ({
      question: faq.question.sv,
      answer: faq.answer.sv,
    }));

    const person = buildGuideAuthorPersonJsonLd(
      bestPetNatWinesSystembolagetSvArticle.author!,
      SEO_BASE,
    );
    const article = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: bestPetNatWinesSystembolagetSvArticle.h1.sv,
      author: guideArticleAuthorRef(
        guideAuthorPersonId(
          bestPetNatWinesSystembolagetSvArticle.author!.name,
          SEO_BASE,
        ),
      ),
    };
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [],
    };
    const faqPage = buildGuideFaqPageJsonLd(svFaqs, {
      name: bestPetNatWinesSystembolagetSvArticle.h1.sv,
    })!;

    const html = scriptsHtml([article, breadcrumb, faqPage, person]);
    const parsed = parseJsonLdScripts(html);

    expect(countJsonLdType(parsed, "Article")).toBe(1);
    expect(countJsonLdType(parsed, "BreadcrumbList")).toBe(1);
    expect(countJsonLdType(parsed, "FAQPage")).toBe(1);
    expect(countJsonLdType(parsed, "Person")).toBe(1);

    const faqNode = parsed.find(
      (node) =>
        node &&
        typeof node === "object" &&
        (node as { "@type"?: string })["@type"] === "FAQPage",
    ) as {
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    };
    expect(faqNode.mainEntity).toHaveLength(svFaqs.length);
    expect(faqNode.mainEntity[0]?.name).toBe(svFaqs[0]?.question);
    expect(faqNode.mainEntity[0]?.acceptedAnswer.text).toBe(svFaqs[0]?.answer);
  });

  it("does not invent FAQPage for guides without faqs in the data model", () => {
    expect(whatIsPetNatArticle.faqs?.length).toBeGreaterThan(0);
    // Guides without FAQ stay null — representative Systembolaget gaps:
    // under-200 and glou-glou have no faqs array (reported in PR, not invented).
    expect(buildGuideFaqPageJsonLd([])).toBeNull();
  });
});

describe("parseJsonLdScripts", () => {
  it("parses multiple script tags and round-trips JSON", () => {
    const docs = [
      { "@type": "Article", headline: "A" },
      { "@type": "FAQPage", mainEntity: [] },
    ];
    const parsed = parseJsonLdScripts(scriptsHtml(docs));
    expect(parsed).toEqual(docs);
  });
});
