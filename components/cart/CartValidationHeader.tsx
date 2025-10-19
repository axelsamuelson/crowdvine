"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
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
        <div className="space-y-2">
          {/* Main message */}
          <p className="text-xs text-foreground font-medium">
            Add more bottles from {invalidValidations.length === 1 ? 'this producer' : 'these producers'} to checkout
          </p>
          <p className="text-xs text-muted-foreground/70">
            Mix freely within each producer
          </p>
          
          {/* Producer list with progress bars */}
          <div className="space-y-2">
            {invalidValidations.map((validation) => {
              const current = validation.quantity || 0;
              const needed = validation.needed || 0;
              const total = current + needed;
              const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
              
              return (
                <div key={validation.producerHandle} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {validation.producerName}
                    </span>
                    <span className="text-xs text-amber-600 font-medium">
                      {current}/{total}
                    </span>
                  </div>
                  <div className="relative h-1 bg-muted-foreground/10 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-foreground/40 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
