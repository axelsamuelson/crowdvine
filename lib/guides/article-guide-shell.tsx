import type { ReactNode } from "react";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";

const RICH_TEXT =
  /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s]+)/g;

const EXTERNAL_REL = "nofollow noopener noreferrer";
const LINK_CLASS = "underline underline-offset-4 hover:text-foreground";

/** Markdown bold, links, and bare http(s) URLs. External links are nofollow. */
export function renderArticleRichText(
  text: string,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(RICH_TEXT.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <span key={`${keyPrefix}-t-${last}`}>
          {text.slice(last, match.index)}
        </span>,
      );
    }
    const bold = match[1];
    const label = match[2];
    const markdownHref = match[3];
    const bareUrl = match[4];
    if (bold) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${match.index}`}>{bold}</strong>,
      );
    } else if (label && markdownHref) {
      const external = /^https?:\/\//.test(markdownHref);
      if (external) {
        nodes.push(
          <a
            key={`${keyPrefix}-a-${match.index}`}
            href={markdownHref}
            target="_blank"
            rel={EXTERNAL_REL}
            className={LINK_CLASS}
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(
          <Link
            key={`${keyPrefix}-a-${match.index}`}
            href={markdownHref}
            className={LINK_CLASS}
          >
            {label}
          </Link>,
        );
      }
    } else if (bareUrl) {
      nodes.push(
        <a
          key={`${keyPrefix}-a-${match.index}`}
          href={bareUrl}
          target="_blank"
          rel={EXTERNAL_REL}
          className={LINK_CLASS}
        >
          {bareUrl}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-t-${last}`}>{text.slice(last)}</span>,
    );
  }
  if (nodes.length === 0) {
    nodes.push(<span key={`${keyPrefix}-t-0`}>{text}</span>);
  }
  return nodes;
}

/** Render body paragraphs with markdown links and bare http(s) URLs. */
function ArticleParagraph({ text }: { text: string }) {
  return <p>{renderArticleRichText(text, "p")}</p>;
}

function ArticleList({
  ordered,
  label,
  items,
  idPrefix,
}: {
  ordered?: boolean;
  label?: string;
  items: string[];
  idPrefix: string;
}) {
  const ListTag = ordered ? "ol" : "ul";
  const labelId = label ? `${idPrefix}-label` : undefined;
  return (
    <div>
      {label ? (
        <p id={labelId} className="mb-2">
          <strong>{label}</strong>
        </p>
      ) : null}
      <ListTag
        aria-labelledby={labelId}
        className={
          ordered
            ? "list-decimal space-y-2 pl-5"
            : "list-disc space-y-2 pl-5"
        }
      >
        {items.map((item, index) => (
          <li key={`${idPrefix}-${index}`}>
            {renderArticleRichText(item, `${idPrefix}-li${index}`)}
          </li>
        ))}
      </ListTag>
    </div>
  );
}

/** Left column: producer / grape. Right: skin contact, alcohol, assortment. */
function isDefinitionLeftColumn(term: string): boolean {
  const t = term.toLocaleLowerCase("sv-SE");
  return (
    t.startsWith("producent") ||
    t.startsWith("producer") ||
    t.startsWith("druva") ||
    t.startsWith("grape")
  );
}

function DefinitionRow({
  term,
  description,
}: {
  term: string;
  description: string;
}) {
  return (
    <div>
      <dt className="font-sans text-[13px] leading-snug text-muted-foreground">
        {term}
      </dt>
      <dd className="mt-0.5 font-sans text-[15px] leading-snug text-foreground/90">
        {renderArticleRichText(description, `dd-${term}`)}
      </dd>
    </div>
  );
}

function ArticleDefinitions({
  items,
  idPrefix,
}: {
  items: Array<{ term: string; description: string }>;
  idPrefix: string;
}) {
  const left = items.filter((item) => isDefinitionLeftColumn(item.term));
  const right = items.filter((item) => !isDefinitionLeftColumn(item.term));

  return (
    <dl
      className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-0"
      data-block={idPrefix}
    >
      <div className="flex flex-col gap-2">
        {left.map((item) => (
          <DefinitionRow
            key={`${idPrefix}-l-${item.term}`}
            term={item.term}
            description={item.description}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {right.map((item) => (
          <DefinitionRow
            key={`${idPrefix}-r-${item.term}`}
            term={item.term}
            description={item.description}
          />
        ))}
      </div>
    </dl>
  );
}

export type ArticleGuideShellBlock =
  | { type: "paragraph"; text: string }
  | {
      type: "list";
      ordered?: boolean;
      label?: string;
      items: string[];
    }
  | {
      type: "heading";
      level?: 3;
      id?: string;
      text: string;
    }
  | {
      type: "definitions";
      items: Array<{ term: string; description: string }>;
    };

export type ArticleGuideShellSection = {
  heading?: string;
  /** Subtle muted text next to the heading (rank badges, etc.). */
  headingBadge?: string;
  paragraphs: string[];
  /** When set, rendered instead of paragraphs. */
  blocks?: ArticleGuideShellBlock[];
};

export type ArticleGuideShellLink = {
  label: string;
  href: string;
};

export type ArticleGuideShellFaq = {
  question: string;
  answer: string;
};

export type ArticleGuideShellProps = {
  h1: string;
  /** Optional author byline under the H1. */
  byline?: string;
  lede?: string;
  sections: ArticleGuideShellSection[];
  /** Rendered after the deck, before the first section (inside the measure column). */
  beforeSections?: ReactNode;
  /** Rendered after the first section when there are 2+ sections. */
  afterFirstSection?: ReactNode;
  /** Rendered after the last section, before further reading (inside the measure column). */
  afterSections?: ReactNode;
  faqs?: ArticleGuideShellFaq[];
  faqHeading?: string;
  furtherReadingHeading?: string;
  internalLinks?: ArticleGuideShellLink[];
  breadcrumb: ReactNode;
  /** Optional class on the outer measure wrapper. */
  className?: string;
  /**
   * Override section / FAQ H2 class (default `ARTICLE_GUIDE_H2_CLASS`).
   * Use when a single guide needs a different H2 scale than the shared default.
   */
  sectionHeadingClassName?: string;
  /**
   * Override wine-entry H3 class (default `ARTICLE_GUIDE_WINE_H3_CLASS`).
   */
  wineHeadingClassName?: string;
};

/** Shared article typography — use these in slot content so classes stay in one place. */
export const ARTICLE_GUIDE_H1_CLASS =
  "mt-6 text-3xl font-medium tracking-[-0.02em] md:text-4xl";

export const ARTICLE_GUIDE_H2_CLASS =
  "mb-4 text-2xl font-medium tracking-[-0.02em] text-foreground";

/**
 * Editorial shortlist H2 (e.g. orange Systembolaget guide): 26px mobile /
 * 28px desktop so section titles stay larger than wine H3s at 22px.
 * Scoped via `sectionHeadingClassName` — do not swap the shared default;
 * `ARTICLE_GUIDE_H2_CLASS` is also used by ranked lists and releases pages.
 */
export const ARTICLE_GUIDE_EDITORIAL_H2_CLASS =
  "mb-4 text-[26px] font-medium tracking-[-0.02em] text-foreground md:text-[28px]";

/** FAQ / generic in-article H3 (Geist). */
export const ARTICLE_GUIDE_H3_CLASS =
  "text-lg font-medium tracking-tight text-foreground";

/**
 * Wine / list-entry H3: Geist, 22px→24px,
 * scroll margin clears the fixed header (`--top-spacing`).
 * `!mt-12` beats parent `space-y-*` so the 48px top gap is reliable.
 * Pair with wine-divider classes for subsequent entries.
 */
export const ARTICLE_GUIDE_WINE_H3_CLASS =
  "scroll-mt-top-spacing text-[22px] font-medium leading-snug tracking-[-0.02em] text-foreground lg:text-2xl";

/**
 * Wine H3 fixed at 22px (no desktop bump) for editorial shortlists whose
 * section H2 uses `ARTICLE_GUIDE_EDITORIAL_H2_CLASS`.
 */
export const ARTICLE_GUIDE_WINE_H3_FIXED_CLASS =
  "scroll-mt-top-spacing text-[22px] font-medium leading-snug tracking-[-0.02em] text-foreground";

/**
 * Between wines: 48px above the rule, 1px ~10% black rule, 48px to the heading.
 */
export const ARTICLE_GUIDE_WINE_DIVIDER_CLASS =
  "!mt-12 border-t border-black/10 pt-12";

export const ARTICLE_GUIDE_QUOTE_CLASS =
  "text-[17px] leading-[1.75] text-foreground/80";

export const ARTICLE_GUIDE_BODY_CLASS =
  "space-y-6 text-[17px] leading-[1.75] text-foreground/80";

/**
 * Shared presentation shell for guide articles.
 * Sole definition of article typography for /guides and /guider.
 * Headings and body use Geist (`font-sans` on body).
 */
export function ArticleGuideShell({
  h1,
  byline,
  lede,
  sections,
  beforeSections,
  afterFirstSection,
  afterSections,
  faqs = [],
  faqHeading,
  furtherReadingHeading,
  internalLinks = [],
  breadcrumb,
  className,
  sectionHeadingClassName,
  wineHeadingClassName,
}: ArticleGuideShellProps) {
  const h2Class = sectionHeadingClassName ?? ARTICLE_GUIDE_H2_CLASS;
  const wineH3Class = wineHeadingClassName ?? ARTICLE_GUIDE_WINE_H3_CLASS;

  return (
    <>
      <div
        className={
          className
            ? `mx-auto max-w-3xl px-6 pt-top-spacing pb-16 ${className}`
            : "mx-auto max-w-3xl px-6 pt-top-spacing pb-16"
        }
      >
        {breadcrumb}

        <div className="max-w-[68ch]">
          <h1 className={ARTICLE_GUIDE_H1_CLASS}>{h1}</h1>

          {byline ? (
            <p className="mt-3 text-sm text-muted-foreground">{byline}</p>
          ) : null}

          {lede ? (
            <p className="mt-4 text-xl leading-relaxed text-muted-foreground">
              {lede}
            </p>
          ) : null}

          <div className="mt-20 flex flex-col gap-14">
            {beforeSections}
            {sections.map((section, sectionIndex) => {
              let wineHeadingCount = 0;
              return (
                <section key={section.heading ?? `section-${sectionIndex}`}>
                  {section.heading ? (
                    <h2 className={h2Class}>
                      <span>{section.heading}</span>
                      {section.headingBadge ? (
                        <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">
                          {section.headingBadge}
                        </span>
                      ) : null}
                    </h2>
                  ) : null}
                  <div className={ARTICLE_GUIDE_BODY_CLASS}>
                    {section.blocks
                      ? section.blocks.map((block, blockIndex) => {
                          if (block.type === "list") {
                            return (
                              <ArticleList
                                key={`list-${sectionIndex}-${blockIndex}`}
                                idPrefix={`list-${sectionIndex}-${blockIndex}`}
                                ordered={block.ordered}
                                label={block.label}
                                items={block.items}
                              />
                            );
                          }
                          if (block.type === "definitions") {
                            return (
                              <ArticleDefinitions
                                key={`dl-${sectionIndex}-${blockIndex}`}
                                idPrefix={`dl-${sectionIndex}-${blockIndex}`}
                                items={block.items}
                              />
                            );
                          }
                          if (block.type === "heading") {
                            const isWineHeading = Boolean(block.id);
                            const showDivider =
                              isWineHeading && wineHeadingCount > 0;
                            if (isWineHeading) wineHeadingCount += 1;
                            const headingClass = isWineHeading
                              ? showDivider
                                ? `${wineH3Class} ${ARTICLE_GUIDE_WINE_DIVIDER_CLASS}`
                                : `${wineH3Class} !mt-12`
                              : `${ARTICLE_GUIDE_H3_CLASS} pt-2`;
                            return (
                              <h3
                                key={`h-${sectionIndex}-${blockIndex}`}
                                id={block.id}
                                className={headingClass}
                              >
                                {block.text}
                              </h3>
                            );
                          }
                          return (
                            <ArticleParagraph
                              key={`p-${sectionIndex}-${blockIndex}`}
                              text={block.text}
                            />
                          );
                        })
                      : section.paragraphs.map((paragraph, paragraphIndex) => (
                          <ArticleParagraph
                            key={`p-${sectionIndex}-${paragraphIndex}`}
                            text={paragraph}
                          />
                        ))}
                  </div>
                  {sectionIndex === 0 && afterFirstSection
                    ? afterFirstSection
                    : null}
                </section>
              );
            })}
            {afterSections}
            {faqs.length > 0 ? (
              <section>
                <h2 className={h2Class}>
                  {faqHeading ?? "Frequently asked questions"}
                </h2>
                <div className="mt-6 space-y-8">
                  {faqs.map((faq) => (
                    <div key={faq.question}>
                      <h3 className={ARTICLE_GUIDE_H3_CLASS}>{faq.question}</h3>
                      <p className="mt-2 text-[17px] leading-[1.75] text-foreground/80">
                        {renderArticleRichText(faq.answer, faq.question)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
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
