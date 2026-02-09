"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { calculatePercentages, formatCurrency } from "@/lib/price-breakdown";
import { cn } from "@/lib/utils";

export interface PriceBreakdownProps {
  costAmount: number; // Base cost in SEK (after exchange)
  alcoholTax: number; // Tax in SEK
  shipping?: number; // Shipping per bottle in SEK (optional)
  margin: number; // Margin amount in SEK
  vat: number; // VAT in SEK
  totalPrice: number; // Final price in SEK
  marginPercentage: number; // Current margin %
  originalMarginPercentage: number; // Original margin %
  hasMemberDiscount: boolean; // If user is member
  memberDiscountPercent?: number; // Member discount on margin
  /** When "inline", render breakdown content only (no popover), for use in product page white box */
  variant?: "popover" | "inline";
}

/** Distinct shades; Flaskkostnad always black; Marginal always rightmost */
const SEGMENT_COLORS = {
  cost: "bg-foreground",
  alcoholTax: "bg-muted-foreground/35",
  shipping: "bg-muted-foreground/30",
  margin: "bg-muted-foreground/50",
  marginDiscounted: "bg-foreground/70",
  vat: "bg-muted-foreground/20",
} as const;

/** When margin is 0, give it a small visible share; rest of bar reflects true value proportions */
const MARGIN_ZERO_DISPLAY_PCT = 2;

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function getDisplayPercentages(
  components: Array<{ label: string; amount: number; percentage: number }>
): number[] {
  const marginIdx = components.findIndex((c) => c.label === "Margin");
  const margin = marginIdx >= 0 ? components[marginIdx] : null;
  const marginIsZero = margin && margin.amount <= 0;

  if (marginIsZero && margin) {
    const otherSum = components
      .filter((c) => c.label !== "Margin")
      .reduce((s, c) => s + Math.max(0, c.percentage), 0);
    const scale = otherSum > 0 ? (100 - MARGIN_ZERO_DISPLAY_PCT) / otherSum : 1;
    return components.map((c) =>
      c.label === "Margin"
        ? MARGIN_ZERO_DISPLAY_PCT
        : Math.max(0, c.percentage) * scale
    );
  }
  return components.map((c) => Math.max(0, c.percentage));
}

function PriceBreakdownContent({
  totalPrice,
  hasMemberDiscount,
  memberDiscountPercent = 0,
  components,
}: PriceBreakdownProps & { components: Array<{ label: string; amount: number; percentage: number; color: string; isDiscounted?: boolean }> }) {
  const displayPcts = getDisplayPercentages(components);
  const total = displayPcts.reduce((s, p) => s + p, 0);
  const widthPcts = total > 0 ? displayPcts.map((p) => (p / total) * 100) : displayPcts.map(() => 25);

  // Check if shipping exists in components (hydration-safe - components are already calculated)
  const hasShipping = components.some((c) => c.label === "Shipping");

  return (
    <div className="space-y-3 min-w-0 overflow-clip">
      <p className="text-sm text-muted-foreground">
        This is how the price is made up: bottle cost, alcohol tax{hasShipping ? ", shipping" : ""}, margin and VAT. Member discount is applied to the margin.
      </p>

      {/* Stacked bar with total price to the right */}
      <div className="flex items-center gap-4">
        <div className="flex-1 rounded-full h-3 overflow-hidden flex bg-muted/50">
        {components.map((component, index) => {
          const isMargin = component.label === "Margin";
          const segmentBg = isMargin && hasMemberDiscount
            ? SEGMENT_COLORS.marginDiscounted
            : isMargin
              ? SEGMENT_COLORS.margin
              : component.label === "Bottle cost"
                ? SEGMENT_COLORS.cost
                : component.label === "Alcohol tax"
                  ? SEGMENT_COLORS.alcoholTax
                  : component.label === "Shipping"
                    ? SEGMENT_COLORS.shipping
                    : SEGMENT_COLORS.vat;
          const widthPct = widthPcts[index];
          return (
            <div
              key={index}
              className={`h-full transition-all duration-300 min-w-[2px] ${segmentBg}`}
              style={{ width: `${widthPct}%` }}
              title={`${component.label}: ${formatCurrency(component.amount)}`}
            />
          );
        })}
        </div>
        <div className="text-lg font-semibold tabular-nums shrink-0">
          {formatCurrency(totalPrice)}
        </div>
      </div>

      {/* Labels to the left - one per row */}
      <div className="space-y-2">
        {components.map((component, index) => {
          const percentage = pct(component.amount, totalPrice);
          return (
            <div
              key={index}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-muted-foreground text-sm" title={component.label}>
                  {component.label}
                  {component.isDiscounted && memberDiscountPercent > 0 && (
                    <span className="text-muted-foreground"> -{memberDiscountPercent}%</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-foreground font-semibold text-sm tabular-nums" title={formatCurrency(component.amount)}>
                  {formatCurrency(component.amount)}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {hasMemberDiscount && (
        <p className="text-xs text-muted-foreground">
          Member discount applied to the margin.
        </p>
      )}
    </div>
  );
}

export function PriceBreakdown({
  costAmount,
  alcoholTax,
  shipping,
  margin,
  vat,
  totalPrice,
  marginPercentage,
  originalMarginPercentage,
  hasMemberDiscount,
  memberDiscountPercent = 0,
  variant = "popover",
}: PriceBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate percentages for visual bars
  const percentages = calculatePercentages({
    cost: costAmount,
    alcoholTax,
    shipping: shipping ?? 0,
    margin,
    vat,
    total: totalPrice,
    marginPercentage,
    originalMarginPercentage,
  });

  /* Order: Bottle cost, Alcohol tax, Shipping (if exists), VAT, Margin (Margin always rightmost) */
  const components = [
    {
      label: "Bottle cost",
      amount: costAmount,
      percentage: percentages.cost,
      color: "",
      isDiscounted: false,
    },
    {
      label: "Alcohol tax",
      amount: alcoholTax,
      percentage: percentages.alcoholTax,
      color: "",
      isDiscounted: false,
    },
    ...(shipping && shipping > 0
      ? [
          {
            label: "Shipping",
            amount: shipping,
            percentage: percentages.shipping ?? 0,
            color: "",
            isDiscounted: false,
          },
        ]
      : []),
    {
      label: "VAT",
      amount: vat,
      percentage: percentages.vat,
      color: "",
      isDiscounted: false,
    },
    {
      label: "Margin",
      amount: margin,
      percentage: percentages.margin,
      color: "",
      isDiscounted: hasMemberDiscount,
    },
  ];

  if (variant === "inline") {
    return (
      <PriceBreakdownContent
        costAmount={costAmount}
        alcoholTax={alcoholTax}
        margin={margin}
        vat={vat}
        totalPrice={totalPrice}
        hasMemberDiscount={hasMemberDiscount}
        memberDiscountPercent={memberDiscountPercent}
        marginPercentage={marginPercentage}
        originalMarginPercentage={originalMarginPercentage}
        components={components}
      />
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-2.5 py-1 text-xs text-foreground/70 hover:bg-foreground/5 transition-colors"
          aria-label="Show price information"
        >
          <CircleHelp className="size-3.5 text-foreground/70" />
          <span className="hidden sm:inline">Price info</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] md:w-[380px] p-4 rounded-xl border bg-popover shadow-2xl"
        align="start"
        side="bottom"
        sideOffset={8}
      >
        <PriceBreakdownContent
          costAmount={costAmount}
          alcoholTax={alcoholTax}
          margin={margin}
          vat={vat}
          totalPrice={totalPrice}
          hasMemberDiscount={hasMemberDiscount}
          memberDiscountPercent={memberDiscountPercent}
          marginPercentage={marginPercentage}
          originalMarginPercentage={originalMarginPercentage}
          components={components}
        />
      </PopoverContent>
    </Popover>
  );
}
