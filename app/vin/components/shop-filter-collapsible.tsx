"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ShopFilterCollapsibleProps {
  title: ReactNode;
  count?: number;
  /**
   * When collapsed with selections, show `Title · Loire, Alsace` instead of
   * `Title (2)`. Desktop leaves this unset so behaviour is unchanged.
   */
  selectionSummary?: string;
  /** When set, overrides open-if-count behaviour for the initial state. */
  defaultOpen?: boolean;
  headerAction?: ReactNode;
  collapsible?: boolean;
  /**
   * Keep children in the DOM while collapsed (for crawlable filter <a href>
   * in SSR HTML). Visual closed state is unchanged.
   */
  forceMountContent?: boolean;
  /**
   * `sheet` = mobile filter drawer: ~44px collapsed rows.
   * Desktop keeps the default density.
   */
  density?: "default" | "sheet";
  className?: string;
  children: ReactNode;
}

export function ShopFilterCollapsible({
  title,
  count = 0,
  selectionSummary,
  defaultOpen,
  headerAction,
  collapsible = true,
  forceMountContent = false,
  density = "default",
  className,
  children,
}: ShopFilterCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen ?? count > 0);
  const isSheet = density === "sheet";
  const summary =
    selectionSummary && selectionSummary.trim().length > 0
      ? selectionSummary.trim()
      : undefined;

  if (!collapsible) {
    return (
      <div className={cn("rounded-md bg-muted px-2.5 py-2", className)}>
        <FilterHeader
          title={title}
          count={count}
          headerAction={headerAction}
        />
        <div className="mt-2">{children}</div>
      </div>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "rounded-md bg-muted px-2.5",
        isSheet ? "py-0" : "py-2",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          isSheet && "min-h-[44px]",
        )}
      >
        <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-foreground/50 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
          <span className="truncate">{title}</span>
          {!open && summary ? (
            <>
              <span
                aria-hidden
                className="shrink-0 font-normal text-foreground/50"
              >
                ·
              </span>
              <span className="min-w-0 truncate font-normal text-foreground/60">
                {summary}
              </span>
            </>
          ) : count > 0 ? (
            <span className="shrink-0 text-foreground/50">({count})</span>
          ) : null}
        </CollapsibleTrigger>
        {headerAction ? (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        ) : null}
      </div>
      <CollapsibleContent
        forceMount={forceMountContent ? true : undefined}
        className={cn(
          "pt-2",
          // forceMount keeps content in the DOM for crawlable <a href>;
          // hide it visually when closed (Radix alone does not).
          forceMountContent && "data-[state=closed]:hidden",
        )}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FilterHeader({
  title,
  count,
  headerAction,
}: {
  title: ReactNode;
  count: number;
  headerAction?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold">
        {title}{" "}
        {count > 0 ? (
          <span className="text-foreground/50">({count})</span>
        ) : null}
      </h3>
      {headerAction}
    </div>
  );
}
