"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  calculateListCompositionPercentages,
  calculatePercentages,
  formatCurrency,
} from "@/lib/price-breakdown";

export interface PriceBreakdownProps {
  costAmount: number; // Base cost in SEK (after exchange)
  alcoholTax: number; // Tax in SEK
  shipping?: number; // Shipping per bottle in SEK (optional)
  margin: number; // Margin amount in SEK
  vat: number; // VAT in SEK
  totalPrice: number; // Final price in SEK (member price when discounted)
  marginPercentage: number; // Business margin % (before member discount)
  originalMarginPercentage: number; // Same as business margin for B2C
  hasMemberDiscount: boolean; // If user is member
  memberDiscountPercent?: number; // Member discount % on gross (B2C)
  /** Positive SEK; shown as a separate line from margin (B2C). */
  memberDiscountAmount?: number;
  /** List price inkl. moms; used for stacked bar composition when discounted. */
  listTotalInclVat?: number;
  /** When "inline", render breakdown content only (no popover), for use in product page white box */
  variant?: "popover" | "inline";
}

/** Distinct shades; Flaskkostnad always black; Marginal always rightmost */
const SEGMENT_COLORS = {
  cost: "bg-foreground",
  alcoholTax: "bg-muted-foreground/35",
  shipping: "bg-muted-foreground/30",
  margin: "bg-muted-foreground/50",
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

type BarSegment = { label: string; amount: number; percentage: number };

type TableRow = {
  label: string;
  amount: number;
  rowPercent: number;
  displayAmount?: string;
};

function PriceBreakdownContent({
  totalPrice,
  hasMemberDiscount,
  memberDiscountPercent = 0,
  memberDiscountAmount = 0,
  listTotalInclVat,
  marginPercentage,
  barSegments,
  tableRows,
}: Pick<
  PriceBreakdownProps,
  | "totalPrice"
  | "hasMemberDiscount"
  | "memberDiscountPercent"
  | "memberDiscountAmount"
  | "listTotalInclVat"
  | "marginPercentage"
> & {
  barSegments: BarSegment[];
  tableRows: TableRow[];
}) {
  const displayPcts = getDisplayPercentages(
    barSegments.map((s) => ({
      label: s.label,
      amount: s.amount,
      percentage: s.percentage,
      color: "",
    })),
  );
  const totalPct = displayPcts.reduce((s, p) => s + p, 0);
  const widthPcts =
    totalPct > 0
      ? displayPcts.map((p) => (p / totalPct) * 100)
      : displayPcts.map(() => 25);

  const hasShipping = barSegments.some((c) => c.label === "Shipping");
  const barCaption =
    hasMemberDiscount && listTotalInclVat
      ? "Strip = share of list price; amount on the right is your member price."
      : null;

  return (
    <div className="space-y-3 min-w-0 overflow-clip">
      <p className="text-sm text-muted-foreground">
        This is how the price is made up: bottle cost, alcohol tax
        {hasShipping ? ", shipping" : ""}, business margin, VAT
        {hasMemberDiscount && memberDiscountAmount
          ? ", and a separate member discount on the list price (same as shop)."
          : "."}
      </p>

      <div className="flex items-center gap-4">
        <div className="flex-1 rounded-full h-3 overflow-hidden flex bg-muted/50">
          {barSegments.map((component, index) => {
            const isMargin = component.label === "Margin";
            const segmentBg = isMargin
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
                key={component.label}
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
      {barCaption && (
        <p className="text-xs text-muted-foreground -mt-1">{barCaption}</p>
      )}

      <div className="space-y-2">
        {tableRows.map((row) => {
          const amountStr = row.displayAmount ?? formatCurrency(row.amount);
          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-muted-foreground text-sm" title={row.label}>
                  {row.label}
                  {row.label === "Margin" && marginPercentage > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({Math.round(marginPercentage)}%)
                    </span>
                  )}
                  {row.label === "Member discount" &&
                    memberDiscountPercent > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        (−{memberDiscountPercent}%)
                      </span>
                    )}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="text-foreground font-semibold text-sm tabular-nums"
                  title={amountStr}
                >
                  {amountStr}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {row.rowPercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildBreakdownRows(
  props: PriceBreakdownProps,
  listBarPct: ReturnType<typeof calculateListCompositionPercentages> | null,
  denomPct: ReturnType<typeof calculatePercentages>,
): { barSegments: BarSegment[]; tableRows: TableRow[] } {
  const {
    costAmount,
    alcoholTax,
    shipping,
    margin,
    vat,
    totalPrice,
    hasMemberDiscount,
    memberDiscountAmount = 0,
    memberDiscountPercent = 0,
  } = props;

  const barFromList = listBarPct != null;
  const bp = barFromList
    ? listBarPct
    : {
        cost: denomPct.cost,
        alcoholTax: denomPct.alcoholTax,
        margin: denomPct.margin,
        vat: denomPct.vat,
        memberDiscount: 0,
      };

  const barSegments: BarSegment[] = [
    { label: "Bottle cost", amount: costAmount, percentage: bp.cost },
    { label: "Alcohol tax", amount: alcoholTax, percentage: bp.alcoholTax },
    ...(shipping && shipping > 0
      ? [
          {
            label: "Shipping",
            amount: shipping,
            percentage: barFromList
              ? ((shipping / (props.listTotalInclVat ?? totalPrice)) * 100)
              : denomPct.shipping ?? 0,
          },
        ]
      : []),
    { label: "VAT", amount: vat, percentage: bp.vat },
    { label: "Margin", amount: margin, percentage: bp.margin },
  ];

  const pctOfMember = (x: number) =>
    Math.round((x / totalPrice) * 100);

  const tableRows: TableRow[] = [
    {
      label: "Bottle cost",
      amount: costAmount,
      rowPercent: pctOfMember(costAmount),
    },
    {
      label: "Alcohol tax",
      amount: alcoholTax,
      rowPercent: pctOfMember(alcoholTax),
    },
    ...(shipping && shipping > 0
      ? [
          {
            label: "Shipping",
            amount: shipping,
            rowPercent: pctOfMember(shipping),
          },
        ]
      : []),
    {
      label: "Margin",
      amount: margin,
      rowPercent: pctOfMember(margin),
    },
    ...(hasMemberDiscount && memberDiscountAmount > 0
      ? [
          {
            label: "Member discount",
            amount: -memberDiscountAmount,
            rowPercent: Math.round((-memberDiscountAmount / totalPrice) * 100),
            displayAmount: `−${formatCurrency(memberDiscountAmount)}`,
          },
        ]
      : []),
    {
      label: "VAT",
      amount: vat,
      rowPercent: pctOfMember(vat),
    },
  ];

  return { barSegments, tableRows };
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
  memberDiscountAmount = 0,
  listTotalInclVat,
  variant = "popover",
}: PriceBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const breakdownLike = {
    cost: costAmount,
    alcoholTax,
    shipping: shipping ?? 0,
    margin,
    vat,
    total: totalPrice,
    marginPercentage,
    originalMarginPercentage,
    memberDiscountAmount:
      hasMemberDiscount && memberDiscountAmount > 0
        ? memberDiscountAmount
        : undefined,
    listTotalInclVat,
  };

  const denomPct = calculatePercentages(breakdownLike);

  const listBarPct =
    hasMemberDiscount &&
    memberDiscountAmount > 0 &&
    listTotalInclVat != null &&
    listTotalInclVat > 0
      ? calculateListCompositionPercentages(breakdownLike)
      : null;

  const { barSegments, tableRows } = buildBreakdownRows(
    {
      costAmount,
      alcoholTax,
      shipping,
      margin,
      vat,
      totalPrice,
      marginPercentage,
      originalMarginPercentage,
      hasMemberDiscount,
      memberDiscountPercent,
      memberDiscountAmount,
      listTotalInclVat,
    },
    listBarPct,
    denomPct,
  );

  const contentProps = {
    totalPrice,
    hasMemberDiscount,
    memberDiscountPercent,
    memberDiscountAmount,
    listTotalInclVat,
    marginPercentage,
    barSegments,
    tableRows,
  };

  if (variant === "inline") {
    return <PriceBreakdownContent {...contentProps} />;
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
        <PriceBreakdownContent {...contentProps} />
      </PopoverContent>
    </Popover>
  );
}
