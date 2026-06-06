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
} from "@/lib/price-breakdown";
import { useDisplayMoney } from "@/lib/hooks/use-display-money";
import { useTranslations } from "@/lib/hooks/use-translations";

export type BreakdownLineKey =
  | "bottleCost"
  | "alcoholTax"
  | "shipping"
  | "margin"
  | "vat"
  | "memberDiscount";

const BREAKDOWN_LINE_MESSAGE_KEYS: Record<BreakdownLineKey, string> = {
  bottleCost: "product.pdp.lineBottleCost",
  alcoholTax: "product.pdp.lineAlcoholTax",
  shipping: "product.pdp.lineShipping",
  margin: "product.pdp.lineMargin",
  vat: "product.pdp.lineVat",
  memberDiscount: "product.pdp.lineMemberDiscount",
};

/** Distinct colors per line item — bar segment and value use the same hue */
const BREAKDOWN_SEGMENT_STYLES: Record<
  BreakdownLineKey,
  { bar: string; value: string; dot: string }
> = {
  bottleCost: {
    bar: "bg-blue-600",
    value: "text-blue-600",
    dot: "bg-blue-600",
  },
  alcoholTax: {
    bar: "bg-amber-500",
    value: "text-amber-600",
    dot: "bg-amber-500",
  },
  shipping: {
    bar: "bg-cyan-500",
    value: "text-cyan-600",
    dot: "bg-cyan-500",
  },
  margin: {
    bar: "bg-violet-600",
    value: "text-violet-600",
    dot: "bg-violet-600",
  },
  vat: {
    bar: "bg-rose-500",
    value: "text-rose-600",
    dot: "bg-rose-500",
  },
  memberDiscount: {
    bar: "bg-emerald-500",
    value: "text-emerald-600",
    dot: "bg-emerald-500",
  },
};

function getSegmentStyle(lineKey: BreakdownLineKey) {
  return (
    BREAKDOWN_SEGMENT_STYLES[lineKey] ?? {
      bar: "bg-muted-foreground",
      value: "text-foreground",
      dot: "bg-muted-foreground",
    }
  );
}

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

/** When margin is 0, give it a small visible share; rest of bar reflects true value proportions */
const MARGIN_ZERO_DISPLAY_PCT = 2;

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function getDisplayPercentages(
  components: Array<{ lineKey: BreakdownLineKey; amount: number; percentage: number }>,
): number[] {
  const marginIdx = components.findIndex((c) => c.lineKey === "margin");
  const margin = marginIdx >= 0 ? components[marginIdx] : null;
  const marginIsZero = margin && margin.amount <= 0;

  if (marginIsZero && margin) {
    const otherSum = components
      .filter((c) => c.lineKey !== "margin")
      .reduce((s, c) => s + Math.max(0, c.percentage), 0);
    const scale = otherSum > 0 ? (100 - MARGIN_ZERO_DISPLAY_PCT) / otherSum : 1;
    return components.map((c) =>
      c.lineKey === "margin"
        ? MARGIN_ZERO_DISPLAY_PCT
        : Math.max(0, c.percentage) * scale,
    );
  }
  return components.map((c) => Math.max(0, c.percentage));
}

type BarSegment = {
  lineKey: BreakdownLineKey;
  amount: number;
  percentage: number;
};

type TableRow = {
  lineKey: BreakdownLineKey;
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
  const { t } = useTranslations();
  const { formatSek } = useDisplayMoney();
  const formatCurrency = (amount: number) => formatSek(amount);
  const lineLabel = (lineKey: BreakdownLineKey) =>
    t(BREAKDOWN_LINE_MESSAGE_KEYS[lineKey]);

  const displayPcts = getDisplayPercentages(
    barSegments.map((s) => ({
      lineKey: s.lineKey,
      amount: s.amount,
      percentage: s.percentage,
    })),
  );
  const totalPct = displayPcts.reduce((s, p) => s + p, 0);
  const widthPcts =
    totalPct > 0
      ? displayPcts.map((p) => (p / totalPct) * 100)
      : displayPcts.map(() => 25);

  const hasShipping = barSegments.some((c) => c.lineKey === "shipping");
  const barCaption =
    hasMemberDiscount && listTotalInclVat
      ? t("product.pdp.priceBreakdownBarCaption")
      : null;

  const introShipping = hasShipping
    ? t("product.pdp.priceBreakdownIntroShipping")
    : "";
  const introMemberDiscount =
    hasMemberDiscount && memberDiscountAmount
      ? t("product.pdp.priceBreakdownIntroMemberDiscount")
      : ".";

  return (
    <div className="space-y-3 min-w-0 overflow-clip">
      <p className="text-sm text-muted-foreground">
        {t("product.pdp.priceBreakdownIntro", {
          shipping: introShipping,
          memberDiscount: introMemberDiscount,
        })}
      </p>

      <div className="flex items-center gap-4">
        <div className="flex-1 rounded-full h-3 overflow-hidden flex bg-muted/30">
          {barSegments.map((component, index) => {
            const segmentStyle = getSegmentStyle(component.lineKey);
            const widthPct = widthPcts[index];
            const label = lineLabel(component.lineKey);
            return (
              <div
                key={component.lineKey}
                className={`h-full transition-all duration-300 min-w-[2px] ${segmentStyle.bar}`}
                style={{ width: `${widthPct}%` }}
                title={`${label}: ${formatCurrency(component.amount)}`}
              />
            );
          })}
        </div>
        <div className="text-lg font-semibold tabular-nums shrink-0 text-foreground">
          {formatCurrency(totalPrice)}
        </div>
      </div>
      {barCaption && (
        <p className="text-xs text-muted-foreground -mt-1">{barCaption}</p>
      )}

      <div className="space-y-2">
        {tableRows.map((row) => {
          const segmentStyle = getSegmentStyle(row.lineKey);
          const label = lineLabel(row.lineKey);
          const amountStr =
            row.lineKey === "memberDiscount"
              ? `−${formatCurrency(Math.abs(row.amount))}`
              : (row.displayAmount ?? formatCurrency(row.amount));
          return (
            <div
              key={row.lineKey}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${segmentStyle.dot}`}
                  aria-hidden
                />
                <span className="text-muted-foreground text-sm" title={label}>
                  {label}
                  {row.lineKey === "margin" && marginPercentage > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({Math.round(marginPercentage)}%)
                    </span>
                  )}
                  {row.lineKey === "memberDiscount" &&
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
                  className={`font-semibold text-sm tabular-nums ${segmentStyle.value}`}
                  title={amountStr}
                >
                  {amountStr}
                </span>
                <span
                  className={`text-xs tabular-nums opacity-75 ${segmentStyle.value}`}
                >
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
    { lineKey: "bottleCost", amount: costAmount, percentage: bp.cost },
    { lineKey: "alcoholTax", amount: alcoholTax, percentage: bp.alcoholTax },
    ...(shipping && shipping > 0
      ? [
          {
            lineKey: "shipping" as const,
            amount: shipping,
            percentage: barFromList
              ? ((shipping / (props.listTotalInclVat ?? totalPrice)) * 100)
              : denomPct.shipping ?? 0,
          },
        ]
      : []),
    { lineKey: "vat", amount: vat, percentage: bp.vat },
    { lineKey: "margin", amount: margin, percentage: bp.margin },
  ];

  const pctOfMember = (x: number) =>
    Math.round((x / totalPrice) * 100);

  const tableRows: TableRow[] = [
    {
      lineKey: "bottleCost",
      amount: costAmount,
      rowPercent: pctOfMember(costAmount),
    },
    {
      lineKey: "alcoholTax",
      amount: alcoholTax,
      rowPercent: pctOfMember(alcoholTax),
    },
    ...(shipping && shipping > 0
      ? [
          {
            lineKey: "shipping" as const,
            amount: shipping,
            rowPercent: pctOfMember(shipping),
          },
        ]
      : []),
    {
      lineKey: "margin",
      amount: margin,
      rowPercent: pctOfMember(margin),
    },
    ...(hasMemberDiscount && memberDiscountAmount > 0
      ? [
          {
            lineKey: "memberDiscount" as const,
            amount: -memberDiscountAmount,
            rowPercent: Math.round((-memberDiscountAmount / totalPrice) * 100),
          },
        ]
      : []),
    {
      lineKey: "vat",
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
  const { t } = useTranslations();
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
          aria-label={t("product.pdp.priceInfoAria")}
        >
          <CircleHelp className="size-3.5 text-foreground/70" />
          <span className="hidden sm:inline">{t("product.pdp.priceInfo")}</span>
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
