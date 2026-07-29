"use client";

import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";

const DEBOUNCE_MS = 200;

export function ShopFilterSearch({
  className,
  autoFocus = false,
  id = "shop-search",
}: {
  className?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const { t } = useTranslations();
  const [q, setQ] = useQueryState(
    "q",
    // Shallow: filter client-side instantly without RSC refetch.
    parseAsString.withOptions({ shallow: true, history: "replace" }),
  );
  const [, setQscope] = useQueryState(
    "qscope",
    parseAsString.withOptions({ shallow: true, history: "replace" }),
  );
  const urlQ = q ?? "";
  const [draft, setDraft] = React.useState(urlQ);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDraft(urlQ);
  }, [urlQ]);

  React.useEffect(() => {
    const trimmedDraft = draft.trim();
    const trimmedUrl = urlQ.trim();
    if (trimmedDraft === trimmedUrl) return;

    const timer = window.setTimeout(() => {
      void setQ(trimmedDraft === "" ? null : trimmedDraft);
      if (trimmedDraft === "") void setQscope(null);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, urlQ, setQ, setQscope]);

  const clear = () => {
    setDraft("");
    void setQ(null);
    void setQscope(null);
    inputRef.current?.focus();
  };

  const commitNow = () => {
    const trimmed = draft.trim();
    void setQ(trimmed === "" ? null : trimmed);
    if (trimmed === "") void setQscope(null);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-500"
        aria-hidden
      />
      <Input
        ref={inputRef}
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            if (draft) clear();
            else inputRef.current?.blur();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            commitNow();
          }
        }}
        placeholder={t("shop.searchPlaceholder")}
        className={cn(
          // Shop shell is always light — override Input's dark:zinc styles.
          "h-10 w-full rounded-md border border-neutral-200/90 bg-[#f3f4f6] pl-9 text-sm text-gray-900 shadow-none",
          "placeholder:text-neutral-500",
          "focus-visible:border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-900/10",
          "dark:border-neutral-200/90 dark:bg-[#f3f4f6] dark:text-gray-900 dark:placeholder:text-neutral-500",
          "dark:focus-visible:border-neutral-300 dark:focus-visible:ring-neutral-900/10",
          "[&::-webkit-search-cancel-button]:hidden",
          draft.length > 0 ? "pr-9" : "pr-3",
        )}
        aria-label={t("shop.searchAria")}
        aria-controls="shop-product-grid"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
      />
      {draft.length > 0 ? (
        <button
          type="button"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-200/80 dark:hover:text-neutral-900"
          aria-label={t("shop.clearSearch")}
          onClick={clear}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
