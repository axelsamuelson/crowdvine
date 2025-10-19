"use client";

import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ProducerValidation } from "@/lib/checkout-validation";
import { cn } from "@/lib/utils";

interface CartValidationHeaderProps {
  validations: ProducerValidation[];
  isValidating: boolean;
}

export function CartValidationHeader({ validations, isValidating }: CartValidationHeaderProps) {
  if (isValidating) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 md:px-4 mb-4"
      >
        <div className="bg-muted/30 border border-border/40 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
            <span className="text-sm text-muted-foreground">Validating cart...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (validations.length === 0) {
    return null;
  }

  // Check if all validations are valid
  const allValid = validations.every(v => v.isValid);
  
  if (allValid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 md:px-4 mb-4"
      >
        <div className="bg-emerald-50/50 border border-emerald-200/40 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm text-emerald-700 font-medium">
              Ready to checkout
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show validation errors
  const invalidValidations = validations.filter(v => !v.isValid);
  const totalBottlesNeeded = invalidValidations.reduce((sum, v) => sum + v.needed, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 md:px-4 mb-4"
    >
      <div className="bg-amber-50/50 border border-amber-200/40 rounded-2xl p-3">
        <div className="space-y-2">
          {/* Main message */}
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-amber-800 font-medium">
                Add {totalBottlesNeeded} more bottle{totalBottlesNeeded !== 1 ? 's' : ''} to checkout
              </p>
              <p className="text-xs text-amber-700/80">
                Mix freely within each producer
              </p>
            </div>
          </div>

          {/* Producer breakdown - compact */}
          <div className="space-y-1 pl-6">
            {invalidValidations.slice(0, 2).map((validation) => (
              <div key={validation.producerHandle} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs text-amber-700">
                  {validation.producerName}: {validation.needed} more
                </span>
              </div>
            ))}
            {invalidValidations.length > 2 && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs text-amber-700">
                  +{invalidValidations.length - 2} more producer{invalidValidations.length - 2 !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
