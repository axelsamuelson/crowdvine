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
  /** When set, overrides open-if-count behaviour for the initial state. */
  defaultOpen?: boolean;
  headerAction?: ReactNode;
  collapsible?: boolean;
  className?: string;
  children: ReactNode;
}

export function ShopFilterCollapsible({
  title,
  count = 0,
  defaultOpen,
  headerAction,
  collapsible = true,
  className,
  children,
}: ShopFilterCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen ?? count > 0);

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
      className={cn("rounded-md bg-muted px-2.5 py-2", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-foreground/50 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden
          />
          <span className="truncate">{title}</span>
          {count > 0 ? (
            <span className="shrink-0 text-foreground/50">({count})</span>
          ) : null}
        </CollapsibleTrigger>
        {headerAction ? (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        ) : null}
      </div>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
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
