import type { Metadata } from "next";
import Link from "next/link";

import { LabelComparisonTable } from "@/components/guides/label-comparison-table";
import { Footer } from "@/components/layout/footer";
import {
  NATURAL_VS_ORGANIC_PATH,
  NATURAL_VS_ORGANIC_UPDATED,
  naturalVsOrganicAuthor,
  naturalVsOrganicFaqs,
  naturalVsOrganicHubCard,
  naturalVsOrganicInternalLinks,
  naturalVsOrganicMeta,
  naturalVsOrganicProducerGroups,
} from "@/lib/guides/articles/natural-vs-organic-vs-biodynamic-wine";
import {
  ARTICLE_GUIDE_BODY_CLASS,
  ARTICLE_GUIDE_H2_CLASS,
  ARTICLE_GUIDE_H3_CLASS,
  renderArticleRichText,
} from "@/lib/guides/article-guide-shell";
import {
  GuideBreadcrumbs,
  buildGuideBreadcrumbJsonLd,
} from "@/lib/guides/guide-breadcrumbs";
import { guideCopy } from "@/lib/guides/guide-copy";
import { getGuideSeoOwnership } from "@/lib/guides/guide-seo-ownership";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { homePathForLocale } from "@/lib/i18n/localized-routes";

function ProducerLinks({
  producers,
}: {
  producers: { name: string; href: string }[];
}) {
  return (
    <p>
      {producers.map((producer, index) => (
        <span key={producer.href}>
          {index > 0 ? ", " : null}
          <Link
            href={producer.href}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {producer.name}
          </Link>
        </span>
      ))}
    </p>
  );
}

export async function buildNaturalVsOrganicMetadata(): Promise<Metadata> {
  const { seoBaseUrl, config } = await getGuideSeoOwnership();
  const pageUrl = `${seoBaseUrl}${NATURAL_VS_ORGANIC_PATH}`;
  const { title, description } = naturalVsOrganicMeta;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "article",
      locale: "en_US",
      siteName: config.siteName,
      images: defaultOpenGraphImages({ siteName: config.siteName, locale: "en" }),
    },
    twitter: pageTwitterCard(title, description),
  };
}

export async function renderNaturalVsOrganicGuidePage() {
  const { seoBaseUrl } = await getGuideSeoOwnership();
  const copy = guideCopy("en");
  const pageUrl = `${seoBaseUrl}${NATURAL_VS_ORGANIC_PATH}`;
  const hubPath = "/guides";

  const authorPerson = {
    "@type": "Person" as const,
    name: naturalVsOrganicAuthor.name,
    jobTitle: naturalVsOrganicAuthor.jobTitle,
    worksFor: {
      "@type": "Organization" as const,
      name: "PACT",
      url: seoBaseUrl,
    },
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: naturalVsOrganicHubCard.title,
    description: naturalVsOrganicMeta.description,
    url: pageUrl,
    inLanguage: "en-US",
    dateModified: NATURAL_VS_ORGANIC_UPDATED,
    isPartOf: {
      "@type": "WebSite",
      name: "PACT",
      url: seoBaseUrl,
    },
    author: authorPerson,
    about: {
      "@type": "Thing",
      name: "Natural, organic and biodynamic wine labels",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: naturalVsOrganicFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbCrumbs = [
    { label: copy.home, href: homePathForLocale("en") },
    { label: copy.hubTitle, href: hubPath },
    {
      label: "What Is Natural Wine?",
      href: "/guides/what-is-natural-wine",
    },
    { label: naturalVsOrganicHubCard.title },
  ];
  const breadcrumbJsonLd = buildGuideBreadcrumbJsonLd(
    breadcrumbCrumbs.map((crumb, index) => {
      const isLast = index === breadcrumbCrumbs.length - 1;
      if (isLast || !crumb.href) {
        return { name: crumb.label };
      }
      const item =
        crumb.href === "/" ? seoBaseUrl : `${seoBaseUrl}${crumb.href}`;
      return { name: crumb.label, item };
    }),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16 font-sans">
        <GuideBreadcrumbs
          crumbs={breadcrumbCrumbs}
          mobileBack={{
            label: "‹ What is Natural Wine?",
            href: "/guides/what-is-natural-wine",
          }}
        />

        <div className="max-w-[68ch]">
          <h1 className="mt-6 font-serif text-3xl font-normal tracking-tight md:text-4xl">
            Natural vs Organic vs Biodynamic Wine
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {naturalVsOrganicAuthor.byline}
            <span aria-hidden="true"> · </span>
            Last reviewed: {NATURAL_VS_ORGANIC_UPDATED}
          </p>

          <p className="mt-6 text-[17px] leading-[1.75] text-foreground/80">
            {renderArticleRichText(
              "“Organic”, “biodynamic” and “natural” are often used as if they meant the same thing. They don’t. Organic and biodynamic are mainly about how grapes are farmed and are backed by certification. “Natural” is about what happens in the cellar, and only a few private charters define it. This guide explains the rules behind each label. For the basics, see [What is natural wine?](/guides/what-is-natural-wine).",
              "lede",
            )}
          </p>

          <blockquote className="mt-8 border-l-2 border-foreground/20 pl-5 font-serif text-xl leading-relaxed text-foreground">
            <p>
              <strong className="font-serif font-normal">In short:</strong>{" "}
              Organic is about how the grapes are farmed. Biodynamic is organic
              plus additional farming practices and, with certifiers like
              Demeter, stricter cellar rules. Natural is about what happens in
              the cellar, and it has no legal definition.
            </p>
          </blockquote>

          <div className="mt-20 flex flex-col gap-14">
            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>Organic wine</h2>
              <div className={ARTICLE_GUIDE_BODY_CLASS}>
                <h3 className={ARTICLE_GUIDE_H3_CLASS}>In the EU</h3>
                <p>
                  EU organic wine must be made from certified organic grapes and
                  follow EU rules on winemaking. The rules restrict which
                  additives and processing aids may be used and set lower
                  sulfite limits than for conventional wine: 100 mg/L (ppm)
                  total SO<sub>2</sub> for red wine and 150 mg/L (ppm) for white
                  and rosé with residual sugar under 2 g/L. Other wines get 30
                  mg/L (ppm) below the conventional limit. These limits were
                  first set in Regulation (EU) No 203/2012 and are carried over
                  under Regulation (EU) 2018/848 (Annex II, Part VI) in
                  Commission Implementing Regulation (EU) 2021/1165, Annex V,
                  Part D.{" "}
                  <em>
                    (Sources: EUR-Lex, Regulation (EU) 2018/848; Implementing
                    Regulation (EU) 2021/1165.)
                  </em>
                </p>

                <h3 className={ARTICLE_GUIDE_H3_CLASS}>
                  In the US: “organic” vs “made with organic grapes”
                </h3>
                <p>The USDA has two categories:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>“Organic” wine:</strong> grapes and other
                    agricultural ingredients must be certified organic, and{" "}
                    <strong>sulfites may not be added</strong>. Naturally
                    occurring sulfites must stay under 10 mg/L (ppm). Only this
                    category can carry the USDA organic seal.
                  </li>
                  <li>
                    <strong>“Made with organic grapes”:</strong> all grapes must
                    be certified organic, but sulfur dioxide{" "}
                    <strong>may be added</strong> as long as total sulfites stay
                    under 100 mg/L (ppm). These labels may not use the USDA
                    seal.
                  </li>
                </ul>
                <p>
                  <em>
                    (Sources: USDA AMS, “Organic Wine: Oversight, Labeling +
                    Trade”; TTB wine labeling guide; NOP Policy Memo 10-2.)
                  </em>
                </p>
                <p>
                  This is why many European organic wines are sold in the US as
                  “made with organic grapes”: EU organic rules allow added
                  sulfites, the USDA “organic” category does not.
                </p>
              </div>
            </section>

            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>Biodynamic wine</h2>
              <div className={ARTICLE_GUIDE_BODY_CLASS}>
                <p>
                  Biodynamic farming builds on organic farming and adds its own
                  practices, such as preparations made on the farm and a
                  calendar for vineyard work. The two main certifiers for wine
                  are <strong>Demeter</strong> and <strong>Biodyvin</strong>. In
                  general, biodynamic certification requires the vineyard to be
                  organically certified first.
                </p>
                <p>
                  Demeter also sets stricter cellar rules. For still wines with
                  under 5 g/L fermentable sugar, Demeter France allows 70 mg/L
                  (ppm) total SO<sub>2</sub> for red wine and 90 mg/L (ppm) for
                  white and rosé. Fermentation must start with native yeasts;
                  added yeast is only tolerated to restart a stuck fermentation,
                  and a wine fermented with added yeast from the start loses the
                  label.{" "}
                  <em>
                    (Source: Demeter France, summary of vinification
                    specification, 2024.)
                  </em>{" "}
                  Biodyvin sets 80 mg/L (ppm) for dry red wine and 105 mg/L
                  (ppm) for dry white and rosé (up to 5 g/L sugar); for wines
                  aged more than 9 months the limits are 110 and 135 mg/L
                  (ppm).{" "}
                  <em>
                    (Source: Biodyvin, Cahier des charges, updated 26 November
                    2024.)
                  </em>
                </p>
              </div>
            </section>

            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>Natural wine</h2>
              <div className={ARTICLE_GUIDE_BODY_CLASS}>
                <p>
                  There is no legal definition of natural wine in the EU or the
                  US. The most established standard is France&apos;s{" "}
                  <strong>Vin Méthode Nature</strong> (since 2020). Under its
                  charter:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    100% of the grapes must come from certified organic farming
                  </li>
                  <li>grapes are hand-harvested</li>
                  <li>fermentation uses only native yeasts</li>
                  <li>no oenological additives</li>
                  <li>
                    no filtration, reverse osmosis, flash pasteurization,
                    thermovinification or centrifugation
                  </li>
                  <li>
                    no sulfites before or during fermentation; a small addition
                    afterwards is allowed up to{" "}
                    <strong>30 mg/L (ppm) total</strong>, and must be shown with
                    a separate logo
                  </li>
                </ul>
                <p>
                  <em>
                    (Source: vinmethodenature.org, “Le label” and Charter of
                    Commitment.)
                  </em>
                </p>
                <p>
                  Many natural wine producers are not certified under any
                  natural wine charter but follow similar principles.
                </p>
              </div>
            </section>

            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>Comparison table</h2>
              <div className={ARTICLE_GUIDE_BODY_CLASS}>
                <LabelComparisonTable />
              </div>
            </section>

            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>Our producers</h2>
              <div className={ARTICLE_GUIDE_BODY_CLASS}>
                <p>
                  PACT works with small producers in the Languedoc, around
                  Béziers. Their farming status, as recorded in our database:
                </p>
                {naturalVsOrganicProducerGroups.map((group) => (
                  <div key={group.heading}>
                    <p>
                      <strong>{group.heading}</strong>
                    </p>
                    <ProducerLinks producers={group.producers} />
                  </div>
                ))}
                <p>
                  For every wine we list the additives and sulfites the producer
                  reports.
                </p>
              </div>
            </section>

            <section>
              <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                Frequently asked questions
              </h2>
              <div className="mt-6 space-y-8">
                {naturalVsOrganicFaqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className={ARTICLE_GUIDE_H3_CLASS}>{faq.question}</h3>
                    <p className="mt-2 text-[17px] leading-[1.75] text-foreground/80">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <nav className="mt-16 space-y-3 border-t border-border pt-8 text-sm">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Further reading
          </h2>
          {naturalVsOrganicInternalLinks.map((link) => (
            <p key={link.href}>
              <Link
                href={link.href}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {link.label}
              </Link>
            </p>
          ))}
        </nav>
      </div>

      <Footer />
    </>
  );
}
