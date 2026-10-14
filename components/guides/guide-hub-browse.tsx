"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import type { GuideHubCard, GuideHubSection } from "@/lib/guides/guide-copy";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 200;

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

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cardMatchesQuery(guide: GuideHubCard, query: string): boolean {
  if (!query) return true;
  const haystack = normalizeSearch(
    `${guide.title} ${guide.description} ${guide.kicker ?? ""}`,
  );
  return haystack.includes(query);
}

export type GuideHubBrowseLabels = {
  searchPlaceholder: string;
  searchAria: string;
  clearSearch: string;
  clear: string;
  all: string;
  filter: string;
  noResults: string;
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

function GuideHubSearchField({
  id,
  value,
  onChange,
  onClear,
  labels,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  labels: Pick<
    GuideHubBrowseLabels,
    "searchPlaceholder" | "searchAria" | "clearSearch"
  >;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
        aria-hidden
      />
      <Input
        ref={inputRef}
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            if (value) onClear();
            else inputRef.current?.blur();
          }
        }}
        placeholder={labels.searchPlaceholder}
        className={cn(
          "h-10 w-full rounded-md border border-neutral-200/90 bg-[#f3f4f6] pl-9 text-sm text-gray-900 shadow-none",
          "placeholder:text-neutral-500",
          "focus-visible:border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-900/10",
          "[&::-webkit-search-cancel-button]:hidden",
          value.length > 0 ? "pr-9" : "pr-3",
        )}
        aria-label={labels.searchAria}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value.length > 0 ? (
        <button
          type="button"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-900"
          aria-label={labels.clearSearch}
          onClick={() => {
            onClear();
            inputRef.current?.focus();
          }}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Guides hub browse chrome: client-side search + section filter.
 * All cards stay in the DOM (SSR + hidden) with real guide links.
 * No URL query params.
 */
export function GuideHubBrowse({
  hubTitle,
  hubIntro,
  sections,
  labels,
}: GuideHubBrowseProps) {
  const searchId = useId();
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
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

  const normalizedQuery = normalizeSearch(query);

  useEffect(() => {
    const trimmed = draftQuery.trim();
    const timer = window.setTimeout(() => {
      setQuery(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draftQuery]);

  useEffect(() => {
    if (!normalizedQuery) return;
    void AnalyticsTracker.trackEvent({
      eventType: "guide_search",
      eventCategory: "search",
      metadata: { q: normalizedQuery },
    });
  }, [normalizedQuery]);

  const hasActiveFilters = Boolean(activeSection) || Boolean(normalizedQuery);

  const visibility = useMemo(() => {
    const cardVisible = new Map<string, boolean>();
    const sectionVisible = new Map<string, boolean>();
    let visibleCount = 0;

    for (const section of orderedSections) {
      const sectionOk =
        activeSection === null || activeSection === section.title;
      let anyCard = false;
      for (const guide of section.cards) {
        const ok = sectionOk && cardMatchesQuery(guide, normalizedQuery);
        cardVisible.set(guide.href, ok);
        if (ok) {
          anyCard = true;
          visibleCount += 1;
        }
      }
      sectionVisible.set(section.title, anyCard);
    }

    return { cardVisible, sectionVisible, visibleCount };
  }, [orderedSections, activeSection, normalizedQuery]);

  const selectSection = (title: string | null) => {
    setActiveSection(title);
    void AnalyticsTracker.trackEvent({
      eventType: "guide_filter",
      eventCategory: "navigation",
      metadata: { typ: title ?? "all" },
    });
  };

  const clearFilters = () => {
    setDraftQuery("");
    setQuery("");
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
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain pb-4 pr-1 pl-2">
          <GuideHubSearchField
            id={`${searchId}-desktop`}
            value={draftQuery}
            onChange={setDraftQuery}
            onClear={() => {
              setDraftQuery("");
              setQuery("");
            }}
            labels={labels}
          />
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

        <div className="mt-8 space-y-4 md:hidden">
          <GuideHubSearchField
            id={`${searchId}-mobile`}
            value={draftQuery}
            onChange={setDraftQuery}
            onClear={() => {
              setDraftQuery("");
              setQuery("");
            }}
            labels={labels}
          />
          <div className="flex items-center justify-between gap-3">
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
        </div>

        <p
          className="mt-6 text-sm text-muted-foreground"
          hidden={visibility.visibleCount > 0}
          role="status"
        >
          {labels.noResults}
        </p>

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
                    const cardIsVisible =
                      visibility.cardVisible.get(guide.href) ?? false;

                    return (
                      <li
                        key={guide.href}
                        hidden={!cardIsVisible}
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
