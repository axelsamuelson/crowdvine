"use client";

import { useState } from "react";
import { ProducerValidation } from "@/lib/checkout-validation";
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface CartValidationDisplayProps {
  validations: ProducerValidation[];
  isLoading?: boolean;
}

export function CartValidationDisplay({
  validations,
  isLoading,
}: CartValidationDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="animate-pulse flex space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 flex-1 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (validations.length === 0) {
    return null;
  }

  const hasInvalid = validations.some((v) => !v.isValid);
  const allValid = validations.every((v) => v.isValid);

  return (
    <div className="border-t border-gray-200">
      {/* Compact summary - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {allValid ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600" />
          )}
          <span className="text-sm font-medium text-gray-900">
            {allValid ? "Ready to order" : `${validations.filter(v => !v.isValid).length} producer${validations.filter(v => !v.isValid).length > 1 ? 's' : ''} need${validations.filter(v => !v.isValid).length === 1 ? 's' : ''} more bottles`}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Info text */}
          <p className="text-xs text-gray-600">
            Orders must be in multiples of 6 bottles per producer
          </p>

          {/* Validation for each producer */}
          <div className="space-y-2">
            {validations.map((validation, index) => (
              <div
                key={index}
                className={`p-2 rounded-md border ${
                  validation.isValid
                    ? "bg-green-50/50 border-green-200"
                    : "bg-amber-50/50 border-amber-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {validation.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-gray-900 truncate">
                        {validation.groupName || validation.producerName}
                      </span>
                      <span className={`text-xs ${validation.isValid ? "text-green-700" : "text-amber-700"}`}>
                        {validation.quantity}
                      </span>
                    </div>

                    {!validation.isValid && (
                      <Link
                        href={`/shop?producer=${validation.producerId}`}
                        className="text-xs text-amber-700 hover:text-amber-900 hover:underline"
                      >
                        + Add {validation.needed} more
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

