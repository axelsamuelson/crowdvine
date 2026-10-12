import type { ReactNode } from "react";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";

const RICH_TEXT =
  /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s]+)/g;

const EXTERNAL_REL = "nofollow noopener noreferrer";
const LINK_CLASS = "underline underline-offset-4 hover:text-foreground";

/** Markdown links and bare http(s) URLs. External links are nofollow. */
function renderRichText(text: string, keyPrefix: string): ReactNode[] {
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
    const label = match[1];
    const markdownHref = match[2];
    const bareUrl = match[3];
    if (label && markdownHref) {
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
  return <p>{renderRichText(text, "p")}</p>;
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
            {renderRichText(item, `${idPrefix}-li${index}`)}
          </li>
        ))}
      </ListTag>
    </div>
  );
}

export type ArticleGuideShellBlock =
  | { type: "paragraph"; text: string }
  | {
      type: "list";
      ordered?: boolean;
      label?: string;
      items: string[];
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
  afterFirstSection,
  afterSections,
  faqs = [],
  faqHeading,
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
                  <h2 className={ARTICLE_GUIDE_H2_CLASS}>
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
                    ? section.blocks.map((block, blockIndex) =>
                        block.type === "list" ? (
                          <ArticleList
                            key={`list-${sectionIndex}-${blockIndex}`}
                            idPrefix={`list-${sectionIndex}-${blockIndex}`}
                            ordered={block.ordered}
                            label={block.label}
                            items={block.items}
                          />
                        ) : (
                          <ArticleParagraph
                            key={`p-${sectionIndex}-${blockIndex}`}
                            text={block.text}
                          />
                        ),
                      )
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
            ))}
            {afterSections}
            {faqs.length > 0 ? (
              <section>
                <h2 className={ARTICLE_GUIDE_H2_CLASS}>
                  {faqHeading ?? "Frequently asked questions"}
                </h2>
                <div className="mt-6 space-y-8">
                  {faqs.map((faq) => (
                    <div key={faq.question}>
                      <h3 className={ARTICLE_GUIDE_H3_CLASS}>{faq.question}</h3>
                      <p className="mt-2 text-[17px] leading-[1.75] text-foreground/80">
                        {renderRichText(faq.answer, faq.question)}
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
