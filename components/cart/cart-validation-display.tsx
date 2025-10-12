"use client";

import { ProducerValidation } from "@/lib/checkout-validation";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

interface CartValidationDisplayProps {
  validations: ProducerValidation[];
  isLoading?: boolean;
}

export function CartValidationDisplay({
  validations,
  isLoading,
}: CartValidationDisplayProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
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

  return (
    <div className="space-y-3 p-4 border-t border-gray-200">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Info className="h-4 w-4" />
        <span>Order Requirements</span>
      </div>

      {/* Info box about 6-bottle rule */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-xs text-blue-900">
          Orders must be in multiples of 6 bottles per producer (6, 12, 18,
          etc.) because wines are packed in 6-bottle cases.
        </AlertDescription>
      </Alert>

      {/* Show validation for each producer/group */}
      <div className="space-y-2">
        {validations.map((validation, index) => (
          <div
            key={index}
            className={`p-3 rounded-md border ${
              validation.isValid
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-start gap-2">
              {validation.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900">
                    {validation.groupName || validation.producerName}
                  </span>
                  <span
                    className={`text-sm ${
                      validation.isValid ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {validation.quantity} bottles
                  </span>
                </div>

                {validation.groupName && (
                  <div className="text-xs text-gray-600 mt-0.5">
                    Group: {validation.producerName}
                  </div>
                )}

                {!validation.isValid && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-amber-800">
                      Add {validation.needed} more{" "}
                      {validation.needed === 1 ? "bottle" : "bottles"} to reach{" "}
                      {validation.quantity + validation.needed} total
                    </div>
                    <Link
                      href={`/shop?producer=${validation.producerId}`}
                      className="inline-flex items-center text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                    >
                      + Browse wines
                    </Link>
                  </div>
                )}

                {validation.isValid && (
                  <div className="text-xs text-green-700 mt-1">
                    ✓ Ready to order
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary message */}
      {hasInvalid && (
        <div className="pt-2 text-xs text-amber-800 font-medium">
          Please add bottles to meet the 6-bottle requirement before checking
          out.
        </div>
      )}
    </div>
  );
}

