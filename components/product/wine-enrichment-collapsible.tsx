"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  WINE_ENRICHMENT_DROPDOWN_LIST_CLASS,
  WINE_ENRICHMENT_LINE_FRAME_CLASS,
  WINE_ENRICHMENT_SPEC_LABEL_CLASS,
} from "@/lib/product/wine-enrichment-ui";

export {
  WINE_ENRICHMENT_DROPDOWN_LIST_CLASS,
  WINE_ENRICHMENT_LINE_FRAME_CLASS,
  WINE_ENRICHMENT_SPEC_LABEL_CLASS,
} from "@/lib/product/wine-enrichment-ui";

interface WineEnrichmentCollapsibleProps {
  title: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function WineEnrichmentCollapsible({
  title,
  children,
  className,
  defaultOpen = false,
}: WineEnrichmentCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "w-full overflow-hidden",
        WINE_ENRICHMENT_LINE_FRAME_CLASS,
        className,
      )}
    >
      <CollapsibleTrigger className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 bg-transparent px-4 text-left transition-colors md:px-5">
        <span
          className={cn(
            "min-w-0 truncate",
            WINE_ENRICHMENT_SPEC_LABEL_CLASS,
          )}
        >
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-foreground/55 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={false}
          animate={reduceMotion ? undefined : { opacity: open ? 1 : 0.96 }}
          className="border-t border-border px-4 py-4 md:px-5"
        >
          {children}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
