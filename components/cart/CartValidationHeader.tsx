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
        className="px-3 md:px-4 mb-2"
      >
        <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-pulse" />
            <span className="text-xs text-foreground/60 font-medium">Validating cart...</span>
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
        className="px-3 md:px-4 mb-2"
      >
        <div className="bg-emerald-50/20 backdrop-blur-md border border-emerald-200/20 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs text-emerald-700 font-medium">
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
      className="px-3 md:px-4 mb-2"
    >
      <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-100/60 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground font-medium truncate">
              Add {totalBottlesNeeded} more bottle{totalBottlesNeeded !== 1 ? 's' : ''} to checkout
            </p>
            {invalidValidations.length <= 2 && (
              <p className="text-xs text-muted-foreground truncate">
                {invalidValidations.map(v => v.producerName).join(', ')}: mix freely
              </p>
            )}
            {invalidValidations.length > 2 && (
              <p className="text-xs text-muted-foreground truncate">
                {invalidValidations.length} producers: mix freely within each
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
