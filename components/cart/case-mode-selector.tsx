"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

export type CaseMode = "same" | "mixed";

export interface CaseModeSelectorProps {
  mode: CaseMode;
  onModeChange: (mode: CaseMode) => void;
  onConfirm: () => void;
  disabled?: boolean;
  /** CTA label (default "Add case") */
  label?: string;
  /** Shows loading state on the CTA */
  pending?: boolean;
  className?: string;
}

/**
 * Shared pill segmented control + full-width CTA for ×6 same vs ×6 mixed (PDP + shop).
 */
export function CaseModeSelector({
  mode,
  onModeChange,
  onConfirm,
  disabled = false,
  label = "Add case",
  pending = false,
  className,
}: CaseModeSelectorProps) {
  const segmentBase =
    "flex-1 min-w-0 rounded-full px-2 py-2 text-center text-xs font-medium leading-none transition-colors sm:text-sm";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border border-black/10 p-2",
        className,
      )}
    >
      <div
        className="flex w-full rounded-full border-[0.5px] border-black/15 p-0.5"
        style={{
          background:
            "var(--color-background-secondary, hsl(var(--secondary)))",
        }}
      >
        <button
          type="button"
          onClick={() => onModeChange("same")}
          className={cn(
            segmentBase,
            mode === "same"
              ? "bg-black text-white"
              : "bg-transparent text-[color:var(--color-text-secondary,hsl(var(--muted-foreground)))]",
          )}
        >
          ×&nbsp;6 same
        </button>
        <button
          type="button"
          onClick={() => onModeChange("mixed")}
          className={cn(
            segmentBase,
            mode === "mixed"
              ? "bg-black text-white"
              : "bg-transparent text-[color:var(--color-text-secondary,hsl(var(--muted-foreground)))]",
          )}
        >
          ×&nbsp;6 mixed
        </button>
      </div>

      <Button
        type="button"
        size="lg"
        disabled={disabled || pending}
        onClick={onConfirm}
        className="h-11 w-full rounded-xl bg-black text-white hover:bg-black/90 border-0"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={pending ? "loading" : "label"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex items-center justify-center gap-2"
          >
            {pending ? <Loader size="default" /> : label}
          </motion.span>
        </AnimatePresence>
      </Button>
    </div>
  );
}
