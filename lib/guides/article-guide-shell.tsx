import type { ReactNode } from "react";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";

const URL_IN_TEXT = /(https?:\/\/[^\s]+)/g;

/** Render body paragraphs with bare http(s) URLs as external links. */
function ArticleParagraph({ text }: { text: string }) {
  const parts = text.split(URL_IN_TEXT);
  return (
    <p>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={`url-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {part}
          </a>
        ) : (
          <span key={`text-${index}`}>{part}</span>
        ),
      )}
    </p>
  );
}

export type ArticleGuideShellSection = {
  heading?: string;
  paragraphs: string[];
};

export type ArticleGuideShellLink = {
  label: string;
  href: string;
};

export type ArticleGuideShellProps = {
  h1: string;
  lede?: string;
  sections: ArticleGuideShellSection[];
  /** Rendered after the deck, before the first section (inside the measure column). */
  beforeSections?: ReactNode;
  /** Rendered after the last section, before further reading (inside the measure column). */
  afterSections?: ReactNode;
  furtherReadingHeading?: string;
  internalLinks?: ArticleGuideShellLink[];
  breadcrumb: ReactNode;
};

/** Shared article typography — use these in slot content so classes stay in one place. */
export const ARTICLE_GUIDE_H2_CLASS =
  "mb-4 text-2xl font-semibold tracking-tight text-foreground";

export const ARTICLE_GUIDE_H3_CLASS =
  "text-lg font-semibold tracking-tight text-foreground";

export const ARTICLE_GUIDE_BODY_CLASS =
  "space-y-6 text-[17px] leading-[1.75] text-foreground/80";

/**
 * Shared presentation shell for guide articles.
 * Sole definition of article typography for /guides and /guider.
 */
export function ArticleGuideShell({
  h1,
  lede,
  sections,
  beforeSections,
  afterSections,
  furtherReadingHeading,
  internalLinks = [],
  breadcrumb,
}: ArticleGuideShellProps) {
  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-top-spacing pb-16">
        {breadcrumb}

        <div className="max-w-[68ch]">
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            {h1}
          </h1>

          {lede ? (
            <p className="mt-4 text-xl leading-relaxed text-muted-foreground">
              {lede}
            </p>
          ) : null}

          <div className="mt-20 flex flex-col gap-14">
            {beforeSections}
            {sections.map((section, sectionIndex) => (
              <section key={section.heading ?? `section-${sectionIndex}`}>
                {section.heading ? (
                  <h2 className={ARTICLE_GUIDE_H2_CLASS}>{section.heading}</h2>
                ) : null}
                <div className={ARTICLE_GUIDE_BODY_CLASS}>
                  {section.paragraphs.map((paragraph) => (
                    <ArticleParagraph
                      key={paragraph.slice(0, 48)}
                      text={paragraph}
                    />
                  ))}
                </div>
              </section>
            ))}
            {afterSections}
          </div>
        </div>

        {furtherReadingHeading ? (
          <nav className="mt-16 space-y-3 border-t border-border pt-8 text-sm">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {furtherReadingHeading}
            </h2>
            {internalLinks.map((link) => (
              <p key={`${link.href}-${link.label}`}>
                <Link
                  href={link.href}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {link.label}
                </Link>
              </p>
            ))}
          </nav>
        ) : null}
      </div>

      <Footer />
    </>
  );
}
