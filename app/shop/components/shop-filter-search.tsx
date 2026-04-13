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
    <div className={cn("relative", className)}>
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
          "h-9 border-input bg-background pl-9 text-sm shadow-sm",
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
