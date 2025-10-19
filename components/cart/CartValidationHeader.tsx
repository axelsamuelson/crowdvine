"use client";

import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ProducerValidation } from "@/lib/checkout-validation";

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
        className="px-3 md:px-4 mb-3"
      >
        <div className="bg-background/80 backdrop-blur-sm border border-border/20 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-foreground/40 animate-pulse" />
            <span className="text-sm text-foreground/70 font-medium">Validating cart...</span>
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
        className="px-3 md:px-4 mb-3"
      >
        <div className="bg-emerald-50/30 backdrop-blur-sm border border-emerald-200/30 rounded-xl p-3">
          <div className="flex items-center gap-3">
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
      className="px-3 md:px-4 mb-3"
    >
      <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-xl p-4 shadow-sm">
        <div className="space-y-3">
          {/* Main message */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100/80 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">
                Add {totalBottlesNeeded} more bottle{totalBottlesNeeded !== 1 ? 's' : ''} to checkout
              </p>
              <p className="text-xs text-muted-foreground">
                Mix freely within each producer
              </p>
            </div>
          </div>

          {/* Producer breakdown - more compact */}
          <div className="space-y-1.5 pl-11">
            {invalidValidations.slice(0, 2).map((validation) => (
              <div key={validation.producerHandle} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                <span className="text-xs text-muted-foreground font-medium">
                  {validation.producerName}: {validation.needed} more
                </span>
              </div>
            ))}
            {invalidValidations.length > 2 && (
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                <span className="text-xs text-muted-foreground/70">
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
