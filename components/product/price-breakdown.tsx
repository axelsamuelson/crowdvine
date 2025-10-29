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
  margin: number; // Margin amount in SEK
  vat: number; // VAT in SEK
  totalPrice: number; // Final price in SEK
  marginPercentage: number; // Current margin %
  originalMarginPercentage: number; // Original margin %
  hasMemberDiscount: boolean; // If user is member
  memberDiscountPercent?: number; // Member discount on margin
}

export function PriceBreakdown({
  costAmount,
  alcoholTax,
  margin,
  vat,
  totalPrice,
  marginPercentage,
  originalMarginPercentage,
  hasMemberDiscount,
  memberDiscountPercent = 0,
}: PriceBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate percentages for visual bars
  const percentages = calculatePercentages({
    cost: costAmount,
    alcoholTax,
    margin,
    vat,
    total: totalPrice,
    marginPercentage,
    originalMarginPercentage,
  });

  // Color scheme for premium look
  const colorScheme = {
    cost: "bg-gray-200 text-gray-700",
    alcoholTax: "bg-amber-200 text-amber-800",
    margin: hasMemberDiscount
      ? "bg-green-200 text-green-800"
      : "bg-slate-200 text-slate-700",
    vat: "bg-blue-200 text-blue-800",
  };

  const components = [
    {
      label: "Bottle cost",
      amount: costAmount,
      percentage: percentages.cost,
      color: colorScheme.cost,
    },
    {
      label: "Alcohol tax",
      amount: alcoholTax,
      percentage: percentages.alcoholTax,
      color: colorScheme.alcoholTax,
    },
    {
      label: "Margin",
      amount: margin,
      percentage: percentages.margin,
      color: colorScheme.margin,
      isDiscounted: hasMemberDiscount,
    },
    {
      label: "VAT",
      amount: vat,
      percentage: percentages.vat,
      color: colorScheme.vat,
    },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-foreground/70 hover:bg-foreground/5 transition-colors"
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
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CircleHelp className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">How this price is composed</h3>
              <p className="text-xs text-muted-foreground">
                The price includes bottle cost, alcohol tax, VAT, and our margin.
                Member discount is applied on the margin.
              </p>
            </div>
          </div>

          {/* Visual breakdown bars */}
          <div className="space-y-3">
            {components.map((component, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          component.color.includes("amber")
                            ? "#f59e0b33"
                            : component.color.includes("green")
                              ? "#10b98133"
                              : component.color.includes("blue")
                                ? "#3b82f633"
                                : "#e5e7eb",
                        outline: "1px solid rgba(0,0,0,0.05)",
                      }}
                    />
                    <span className="text-foreground/70 truncate">{component.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {component.isDiscounted && (
                      <span className="text-xs text-green-600 font-medium">
                        -{memberDiscountPercent}%
                      </span>
                    )}
                    <span className="font-medium">{formatCurrency(component.amount)}</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${component.percentage}%`,
                      background:
                        component.color.includes("amber")
                          ? "linear-gradient(90deg,#fde68a,#f59e0b)"
                          : component.color.includes("green")
                            ? "linear-gradient(90deg,#bbf7d0,#10b981)"
                            : component.color.includes("blue")
                              ? "linear-gradient(90deg,#bfdbfe,#3b82f6)"
                              : "linear-gradient(90deg,#e5e7eb,#9ca3af)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Member discount info */}
          {hasMemberDiscount && (
            <div className="text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded-md">
              ✨ Member discount applied on margin
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
