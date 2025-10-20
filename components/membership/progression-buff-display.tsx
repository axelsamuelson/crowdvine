"use client";

import { Sparkles, TrendingUp, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressionBuffDisplayProps {
  totalBuffPercentage: number;
  buffDetails?: Array<{
    percentage: number;
    description: string;
    earnedAt: string;
  }>;
  expiresOnUse?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Display active progression buffs for user
 * Shows total percentage and optional breakdown of individual buffs
 */
export function ProgressionBuffDisplay({
  totalBuffPercentage,
  buffDetails = [],
  expiresOnUse = true,
  className,
  compact = false,
}: ProgressionBuffDisplayProps) {
  // Don't show if no buffs
  if (totalBuffPercentage <= 0) {
    return null;
  }

  if (compact) {
    // Compact version for checkout summary
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="font-medium text-amber-700">
          Progress bonus: +{totalBuffPercentage.toFixed(1)}%
        </span>
        {expiresOnUse && (
          <span className="text-xs text-gray-500">(expires on use)</span>
        )}
      </div>
    );
  }

  // Full version for profile page
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-100">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Active Progress Bonus
            </h3>
            <p className="text-xs text-gray-600">Applied to your next order</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-amber-600">
            +{totalBuffPercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">discount</div>
        </div>
      </div>

      {buffDetails && buffDetails.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-amber-200">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
            <Gift className="w-3.5 h-3.5" />
            <span>Earned Bonuses:</span>
          </div>
          {buffDetails.map((buff, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs bg-white/60 rounded-lg px-3 py-2"
            >
              <span className="text-gray-700">{buff.description}</span>
              <span className="font-semibold text-amber-600">
                +{buff.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}

      {expiresOnUse && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-xs text-gray-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            This bonus will be automatically applied to your next reservation
            and then expire.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Mini badge version for showing buff in product cards or small spaces
 */
export function ProgressionBuffBadge({
  percentage,
  className,
}: {
  percentage: number;
  className?: string;
}) {
  if (percentage <= 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full",
        "bg-amber-100 text-amber-700 text-xs font-medium",
        className,
      )}
    >
      <Sparkles className="w-3 h-3" />
      <span>+{percentage.toFixed(1)}% bonus</span>
    </div>
  );
}
