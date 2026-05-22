"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildDistributionChain,
  formatInviteKr,
  illustrativePactPriceKr,
  ILLUSTRATIVE_PRODUCER_PRICE_KR,
} from "@/lib/invite-landing/distribution-chain-pricing";
import {
  InviteStoryHeader,
  inviteStory,
  inviteStoryPills,
} from "@/components/invite-landing/invite-story-ui";

function chainBlockClass(variant: "producer" | "middle" | "retail"): string {
  if (variant === "producer") {
    return cn(inviteStoryPills.secondary, "border-border");
  }
  if (variant === "retail") {
    return "bg-muted border-border text-foreground";
  }
  return "bg-card border-border text-card-foreground";
}

export function PricingSavingsSection() {
  const chain = useMemo(
    () => buildDistributionChain(ILLUSTRATIVE_PRODUCER_PRICE_KR),
    [],
  );
  const retailKr = chain[chain.length - 1]?.priceKr ?? 0;
  const pactKr = illustrativePactPriceKr(ILLUSTRATIVE_PRODUCER_PRICE_KR);
  const savingsKr = Math.max(0, retailKr - pactKr);
  const savingsPct =
    retailKr > 0 ? Math.round((savingsKr / retailKr) * 100) : 0;

  return (
    <div>
      <InviteStoryHeader
        eyebrow="How it works"
        title={
          <>
            Det mesta går till{" "}
            <em className="italic">mellanled</em>
          </>
        }
        subtitle="PACT köper direkt från producenten—utan kedjan av påslag."
      />

      <motion.div
        className="mb-12 md:mb-14 overflow-x-auto pb-2 -mx-1 px-1"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.05 }}
      >
        <div className="flex items-stretch min-w-[min(100%,100%)] w-full gap-0">
          {chain.map((step, i) => (
            <div key={step.id} className="flex items-stretch flex-1 min-w-0">
              <div
                className={cn(
                  "flex-1 min-w-0 rounded-lg border px-1.5 py-2.5 sm:px-2 sm:py-3 text-center",
                  chainBlockClass(step.variant),
                )}
              >
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-80 truncate">
                  {step.label}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {step.markupLabel}
                </p>
                <p className="font-sans text-sm sm:text-base md:text-lg font-semibold tabular-nums mt-1 text-foreground">
                  {formatInviteKr(step.priceKr)}
                </p>
              </div>
              {i < chain.length - 1 && (
                <div
                  className="flex shrink-0 items-center px-0.5 sm:px-1 text-muted-foreground"
                  aria-hidden
                >
                  <ChevronRight className="size-3.5 sm:size-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex flex-col-reverse sm:flex-row sm:items-stretch gap-4 sm:gap-6">
          <div className={cn(inviteStory.cardHighlight, "flex-1 text-center")}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Systembolaget
            </p>
            <p className={cn("text-4xl sm:text-5xl", inviteStory.heroNumber)}>
              {formatInviteKr(retailKr)}
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-snug">
              efter påslag i kedjan
            </p>
          </div>

          <div className="flex sm:flex-col items-center justify-center shrink-0 py-1 sm:py-0">
            <span className="font-sans italic text-lg text-muted-foreground">
              vs
            </span>
          </div>

          <div
            className={cn(
              inviteStory.card,
              "flex-1 text-center border-border bg-card",
            )}
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Via PACT
            </p>
            <p className={cn("text-4xl sm:text-5xl", inviteStory.heroNumber)}>
              {formatInviteKr(pactKr)}
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-snug">
              producent + delad frakt
            </p>
          </div>
        </div>

        <div
          className={cn(
            inviteStory.accentBanner,
            "mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
          )}
        >
          <p className="text-sm sm:text-base font-medium text-foreground max-w-xs">
            Du sparar när kedjan försvinner
          </p>
          <div className="text-left sm:text-right">
            <p className="text-5xl sm:text-6xl md:text-7xl leading-none tabular-nums text-foreground font-sans font-semibold">
              {formatInviteKr(savingsKr)}
            </p>
            {savingsPct > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ca {savingsPct}% under kedjepris
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <p className="mt-10 text-center text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
        Avgift och frakt visas innan du bekräftar. Priser är exempel.
      </p>
    </div>
  );
}
