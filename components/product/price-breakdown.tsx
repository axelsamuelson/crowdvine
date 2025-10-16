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
    margin: hasMemberDiscount ? "bg-green-200 text-green-800" : "bg-slate-200 text-slate-700",
    vat: "bg-blue-200 text-blue-800",
  };

  const components = [
    {
      label: "Kostnad flaska",
      amount: costAmount,
      percentage: percentages.cost,
      color: colorScheme.cost,
    },
    {
      label: "Alkoholskatt",
      amount: alcoholTax,
      percentage: percentages.alcoholTax,
      color: colorScheme.alcoholTax,
    },
    {
      label: "Marginal",
      amount: margin,
      percentage: percentages.margin,
      color: colorScheme.margin,
      isDiscounted: hasMemberDiscount,
    },
    {
      label: "Moms",
      amount: vat,
      percentage: percentages.vat,
      color: colorScheme.vat,
    },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Visa prisuppdelning"
        >
          <CircleHelp className="w-4 h-4 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4 bg-white border border-gray-200 shadow-lg rounded-lg"
        align="start"
        side="bottom"
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Prisuppdelning</h3>
          
          {/* Visual breakdown bars */}
          <div className="space-y-2">
            {components.map((component, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">{component.label}</span>
                  <div className="flex items-center gap-1">
                    {component.isDiscounted && (
                      <span className="text-xs text-green-600 font-medium">
                        -{memberDiscountPercent}%
                      </span>
                    )}
                    <span className="font-medium">{formatCurrency(component.amount)}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      component.color.split(' ')[0] // Use only the background color class
                    )}
                    style={{ width: `${component.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          {/* Member discount info */}
          {hasMemberDiscount && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              ✨ Medlemsrabatt på marginalen tillämpad
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
