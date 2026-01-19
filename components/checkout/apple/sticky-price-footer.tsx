"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type StickyLine = {
  label: string;
  value: string;
  subtle?: boolean;
  accent?: boolean;
};

interface AppleStickyPriceFooterProps {
  totalLabel: string;
  totalValue: string;
  lines?: StickyLine[];
  ctaLabel: string;
  onCheckout: () => void;
  disabled?: boolean;
}

export function AppleStickyPriceFooter({
  totalLabel,
  totalValue,
  lines = [],
  ctaLabel,
  onCheckout,
  disabled,
}: AppleStickyPriceFooterProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transition-all duration-300 ease-in-out lg:hidden">
      {showDetails && lines.length > 0 && (
        <div className="container mx-auto py-3 px-4 md:px-6 border-b border-gray-100">
          <div className="max-w-md mx-auto space-y-2">
            {lines.map((line) => (
              <div
                key={`${line.label}-${line.value}`}
                className="flex justify-between"
              >
                <span
                  className={[
                    "text-sm",
                    line.subtle ? "text-gray-400" : "text-gray-500",
                    line.accent ? "text-amber-700" : "",
                  ].join(" ")}
                >
                  {line.label}
                </span>
                <span
                  className={[
                    "text-sm font-medium",
                    line.subtle ? "text-gray-400" : "text-gray-900",
                    line.accent ? "text-amber-700" : "",
                  ].join(" ")}
                >
                  {line.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="container mx-auto py-4 px-4 md:px-6">
        <div className="flex items-center justify-between max-w-5xl mx-auto gap-4">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            type="button"
            aria-label="Toggle price details"
          >
            <div className="flex flex-col mr-2">
              <span className="text-sm text-gray-500">{totalLabel}</span>
              <span className="text-2xl font-medium text-gray-900">
                {totalValue}
              </span>
            </div>
            {showDetails ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </button>

          <Button
            onClick={onCheckout}
            size="lg"
            className="px-8 rounded-full"
            disabled={disabled}
            type="button"
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}


