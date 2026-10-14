"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import type { GuideHubCard, GuideHubSection } from "@/lib/guides/guide-copy";
import { cn } from "@/lib/utils";

export function hubSectionId(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function orderHubCards(cards: GuideHubCard[]): GuideHubCard[] {
  const featured = cards.filter((card) => card.featured);
  const rest = cards.filter((card) => !card.featured);
  return [...featured, ...rest];
}

export type GuideHubBrowseLabels = {
  clear: string;
  all: string;
  filter: string;
};

export type GuideHubBrowseProps = {
  hubTitle: string;
  hubIntro: string;
  sections: GuideHubSection[];
  labels: GuideHubBrowseLabels;
};

function GuideHubCardLink({ guide }: { guide: GuideHubCard }) {
  const featured = Boolean(guide.featured);

  return (
    <Link href={guide.href} className="group block h-full">
      {guide.kicker ? (
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {guide.kicker}
        </span>
      ) : null}
      <h3
        className={cn(
          "font-semibold tracking-tight text-foreground/80 transition-colors group-hover:text-foreground",
          featured ? "text-2xl md:text-3xl" : "text-base md:text-lg",
          guide.kicker && "mt-1",
        )}
      >
        {guide.title}
      </h3>
      <p
        className={cn(
          "mt-2 leading-relaxed text-muted-foreground",
          featured ? "text-base max-w-[68ch]" : "text-sm line-clamp-3",
        )}
      >
        {guide.description}
      </p>
    </Link>
  );
}

/**
 * Guides hub browse chrome: client-side section filter.
 * All cards stay in the DOM (SSR + hidden) with real guide links.
 * No URL query params.
 */
export function GuideHubBrowse({
  hubTitle,
  hubIntro,
  sections,
  labels,
}: GuideHubBrowseProps) {
  /** null = all sections */
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const orderedSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        id: hubSectionId(section.title),
        cards: orderHubCards(section.cards),
      })),
    [sections],
  );

  const hasActiveFilters = Boolean(activeSection);

  const visibility = useMemo(() => {
    const sectionVisible = new Map<string, boolean>();
    let visibleCount = 0;

    for (const section of orderedSections) {
      const ok = activeSection === null || activeSection === section.title;
      sectionVisible.set(section.title, ok);
      if (ok) visibleCount += section.cards.length;
    }

    return { sectionVisible, visibleCount };
  }, [orderedSections, activeSection]);

  const selectSection = (title: string | null) => {
    setActiveSection(title);
    void AnalyticsTracker.trackEvent({
      eventType: "guide_filter",
      eventCategory: "navigation",
      metadata: { typ: title ?? "all" },
    });
  };

  const clearFilters = () => {
    setActiveSection(null);
  };

  const sectionFilterButtons = (
    <ul className="flex flex-col gap-0.5">
      <li>
        <button
          type="button"
          onClick={() => selectSection(null)}
          className={cn(
            "flex w-full text-left text-sm transition-all md:hover:translate-x-1 md:hover:opacity-80",
            activeSection === null
              ? "font-medium text-foreground"
              : "text-foreground/80",
          )}
          aria-pressed={activeSection === null}
        >
          {labels.all}
        </button>
      </li>
      {orderedSections.map((section) => {
        const selected = activeSection === section.title;
        return (
          <li key={section.title}>
            <button
              type="button"
              onClick={() => selectSection(section.title)}
              className={cn(
                "flex w-full text-left text-sm transition-all md:hover:translate-x-1 md:hover:opacity-80",
                selected
                  ? "font-medium text-foreground translate-x-1"
                  : "text-foreground/80",
              )}
              aria-pressed={selected}
            >
              {section.title}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="mt-6 flex flex-col md:grid md:grid-cols-12 md:gap-4">
      <aside
        aria-labelledby="guide-hub-nav-label"
        className="sticky top-top-spacing col-span-3 hidden max-h-[calc(100vh-var(--top-spacing))] min-h-0 w-full flex-col self-start pl-sides md:flex"
      >
        <div className="flex shrink-0 items-baseline justify-between pb-2 pl-2">
          <p id="guide-hub-nav-label" className="text-xl font-semibold">
            {labels.filter}
            {hasActiveFilters ? (
              <span className="text-foreground/50">
                {" "}
                ({visibility.visibleCount})
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              "text-sm font-medium text-foreground/50 transition-opacity hover:text-foreground/60",
              !hasActiveFilters && "pointer-events-none opacity-0",
            )}
            disabled={!hasActiveFilters}
          >
            {labels.clear}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pb-4 pr-1 pl-2">
          <nav aria-label={labels.filter}>{sectionFilterButtons}</nav>
        </div>
      </aside>

      <div className="col-span-9 flex flex-col px-sides md:px-0 md:pr-sides">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {hubTitle}
        </h1>

        <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-muted-foreground">
          {hubIntro}
        </p>

        <div className="mt-8 flex items-center justify-between gap-3 md:hidden">
          <nav
            aria-label={labels.filter}
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground"
          >
            <button
              type="button"
              onClick={() => selectSection(null)}
              className={cn(
                "hover:text-foreground",
                activeSection === null && "font-medium text-foreground",
              )}
              aria-pressed={activeSection === null}
            >
              {labels.all}
            </button>
            {orderedSections.map((section) => (
              <button
                key={section.title}
                type="button"
                onClick={() => selectSection(section.title)}
                className={cn(
                  "hover:text-foreground",
                  activeSection === section.title &&
                    "font-medium text-foreground",
                )}
                aria-pressed={activeSection === section.title}
              >
                {section.title}
              </button>
            ))}
          </nav>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 text-sm font-medium text-foreground/50 hover:text-foreground/60"
            >
              {labels.clear}
            </button>
          ) : null}
        </div>

        <div className="mt-10 md:mt-12">
          {orderedSections.map((section) => {
            const sectionIsVisible =
              visibility.sectionVisible.get(section.title) ?? false;

            return (
              <section
                key={section.title}
                className="mt-12 first:mt-0 md:mt-16"
                hidden={!sectionIsVisible}
              >
                <h2
                  id={section.id}
                  className="mb-6 scroll-mt-24 border-b border-border pb-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  <a
                    href={`#${section.id}`}
                    className="hover:text-foreground"
                  >
                    {section.title}
                  </a>
                </h2>
                <ul className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                  {section.cards.map((guide) => {
                    const featured = Boolean(guide.featured);

                    return (
                      <li
                        key={guide.href}
                        className={cn(
                          "min-w-0 border-b border-border pb-6",
                          featured && "sm:col-span-2 xl:col-span-3",
                        )}
                      >
                        <GuideHubCardLink guide={guide} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
