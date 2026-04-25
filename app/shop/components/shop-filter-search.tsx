"use client";

import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 450;

export function ShopFilterSearch({ className }: { className?: string }) {
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withOptions({ shallow: false }),
  );
  const urlQ = q ?? "";
  const [draft, setDraft] = React.useState(urlQ);

  React.useEffect(() => {
    setDraft(urlQ);
  }, [urlQ]);

  React.useEffect(() => {
    const trimmedDraft = draft.trim();
    const trimmedUrl = urlQ.trim();
    if (trimmedDraft === trimmedUrl) return;

    const id = window.setTimeout(() => {
      void setQ(trimmedDraft === "" ? null : trimmedDraft);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [draft, urlQ, setQ]);

  const clear = () => {
    setDraft("");
    void setQ(null);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      {/* type="text" avoids the browser's second clear control on type="search" */}
      <Input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search wines or producers…"
        className={cn(
          // Force a light search surface in both B2C and B2B themes.
          "h-9 rounded-md border border-border/60 bg-[#f3f4f6] dark:bg-[#f3f4f6] pl-9 text-sm text-gray-900 dark:text-gray-900 placeholder:text-muted-foreground dark:placeholder:text-muted-foreground shadow-none",
          draft.length > 0 ? "pr-9" : "pr-3",
        )}
        aria-label="Search shop"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {draft.length > 0 ? (
        <button
          type="button"
          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
          onClick={clear}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
