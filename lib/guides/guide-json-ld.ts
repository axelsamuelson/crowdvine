import {
  articleLinkText,
  type GuideArticleAuthor,
} from "@/lib/guides/guide-types";

/** Stable Person `@id` for a named guide author (slugified name). */
export function guideAuthorPersonId(
  name: string,
  seoBaseUrl: string,
): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  return `${seoBaseUrl}/#/schema/person/${slug}`;
}

export type GuideAuthorPersonFields = Pick<
  GuideArticleAuthor,
  "name" | "jobTitle" | "url" | "sameAs"
>;

/**
 * Standalone Person node for Article.author via `@id`.
 * Only includes `url` / `sameAs` when present on the author object — never invent.
 */
export function buildGuideAuthorPersonJsonLd(
  author: GuideAuthorPersonFields,
  seoBaseUrl: string,
): Record<string, unknown> {
  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": guideAuthorPersonId(author.name, seoBaseUrl),
    name: author.name,
    worksFor: {
      "@type": "Organization",
      name: "PACT",
      url: seoBaseUrl,
    },
  };

  if (author.jobTitle) {
    person.jobTitle = author.jobTitle;
  }
  if (author.url) {
    person.url = author.url;
  }
  if (author.sameAs && author.sameAs.length > 0) {
    person.sameAs = [...author.sameAs];
  }

  return person;
}

/** Article.author reference to a Person `@id` (no nested Person duplicate). */
export function guideArticleAuthorRef(
  personId: string,
): { "@id": string } {
  return { "@id": personId };
}

export type GuideFaqJsonLdItem = {
  question: string;
  answer: string;
};

/**
 * FAQPage JSON-LD from visible Q&A text.
 * Answer text is normalized with `articleLinkText` so markdown links match
 * the visible anchor text (Google FAQ visibility requirement).
 * Returns null when there are no FAQs — callers must not emit FAQPage then.
 */
export function buildGuideFaqPageJsonLd(
  faqs: readonly GuideFaqJsonLdItem[],
  options?: { name?: string },
): Record<string, unknown> | null {
  if (faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(options?.name ? { name: options.name } : {}),
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: articleLinkText(faq.answer),
      },
    })),
  };
}

/**
 * Parse every `application/ld+json` script from HTML (or concatenated scripts).
 * Used by unit tests to assert schema shape without a browser.
 */
export function parseJsonLdScripts(html: string): unknown[] {
  const results: unknown[] = [];
  const re =
    /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    results.push(JSON.parse(raw));
  }
  return results;
}

/** Count nodes of a given `@type` in a JSON-LD document tree (incl. arrays). */
export function countJsonLdType(nodes: unknown, type: string): number {
  let count = 0;
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const t = record["@type"];
    if (t === type || (Array.isArray(t) && t.includes(type))) {
      count += 1;
    }
    for (const value of Object.values(record)) {
      if (value && typeof value === "object") visit(value);
    }
  };
  visit(nodes);
  return count;
}
