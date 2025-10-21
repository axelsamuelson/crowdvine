"use client";

import { motion } from "motion/react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ProducerValidation } from "@/lib/checkout-validation";
import { WhySixBottlesModal } from "./WhySixBottlesModal";

interface CartValidationHeaderProps {
  validations: ProducerValidation[];
  isValidating: boolean;
}

export function CartValidationHeader({
  validations,
  isValidating,
}: CartValidationHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
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
            <span className="text-xs text-foreground/60 font-medium">
              Validating cart...
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Always show header when there are items in cart, even if no validation errors
  // This allows users to learn about the 6-bottle rule via the help icon

  // Check if all validations are valid
  const allValid = validations.every((v) => v.isValid);

  if (allValid && validations.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 md:px-4 mb-3"
      >
        <div className="bg-gradient-to-r from-emerald-50/30 to-green-50/20 backdrop-blur-sm border border-emerald-200/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-emerald-700 font-medium tracking-wide">
                Ready to checkout
              </span>
            </div>
            <button
              onClick={() => setShowWhyModal(true)}
              className="text-xs text-emerald-600/70 hover:text-emerald-600 font-medium tracking-wide uppercase transition-colors"
              title="Why 6 bottles per producer?"
            >
              Why?
            </button>
          </div>
        </div>
        
        {/* Why Six Bottles Modal */}
        <WhySixBottlesModal
          isOpen={showWhyModal}
          onClose={() => setShowWhyModal(false)}
        />
      </motion.div>
    );
  }

  // Show informational header when no validation errors but cart has items
  if (validations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 md:px-4 mb-3"
      >
        <div className="bg-gradient-to-r from-blue-50/30 to-indigo-50/20 backdrop-blur-sm border border-blue-200/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm text-blue-700 font-medium tracking-wide">
                Learn about our 6-bottle minimum rule
              </span>
            </div>
            <button
              onClick={() => setShowWhyModal(true)}
              className="text-xs text-blue-600/70 hover:text-blue-600 font-medium tracking-wide uppercase transition-colors"
              title="Why 6 bottles per producer?"
            >
              Why?
            </button>
          </div>
        </div>
        
        {/* Why Six Bottles Modal */}
        <WhySixBottlesModal
          isOpen={showWhyModal}
          onClose={() => setShowWhyModal(false)}
        />
      </motion.div>
    );
  }

  // Show validation errors
  const invalidValidations = validations.filter((v) => !v.isValid);
  const validValidations = validations.filter((v) => v.isValid);
  const totalBottlesNeeded = invalidValidations.reduce(
    (sum, v) => sum + v.needed,
    0,
  );
  const allValidations = [...invalidValidations, ...validValidations];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 md:px-4 mb-3"
    >
      <div className="bg-gradient-to-r from-amber-50/30 to-orange-50/20 backdrop-blur-sm border border-amber-200/30 rounded-xl p-4">
        <div className="space-y-3">
          {/* Folded state - show only summary */}
          {!isExpanded && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-sm text-amber-700 font-medium tracking-wide">
                  {invalidValidations.length} producer
                  {invalidValidations.length !== 1 ? "s" : ""} need more bottles
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWhyModal(true)}
                  className="text-xs text-amber-600/70 hover:text-amber-600 font-medium tracking-wide uppercase transition-colors"
                  title="Why 6 bottles per producer?"
                >
                  Why?
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-amber-100/50 rounded transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-amber-600" />
                </button>
              </div>
            </div>
          )}

          {/* Expanded state - show full details */}
          {isExpanded && (
            <>
              {/* Header with fold/unfold button */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-amber-800 font-medium tracking-wide">
                    Add more bottles from{" "}
                    {invalidValidations.length === 1
                      ? "this producer"
                      : "these producers"}{" "}
                    to checkout
                  </p>
                  <p className="text-xs text-amber-600/70 mt-1">
                    Mix freely within each producer
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowWhyModal(true)}
                    className="text-xs text-amber-600/70 hover:text-amber-600 font-medium tracking-wide uppercase transition-colors"
                    title="Why 6 bottles per producer?"
                  >
                    Why?
                  </button>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-amber-100/50 rounded transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 text-amber-600" />
                  </button>
                </div>
              </div>

              {/* Progress bars */}
              <div className="space-y-3 pt-2">
                {allValidations.map((validation) => {
                  const current = validation.quantity || 0;
                  const needed = validation.needed || 0;
                  const total = current + needed;
                  const progress =
                    total > 0 ? Math.min((current / total) * 100, 100) : 0;
                  const isComplete = validation.isValid;

                  return (
                    <div key={validation.producerHandle} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-amber-800 font-medium">
                          {validation.producerName}
                        </span>
                        <span
                          className={`text-sm font-semibold ${isComplete ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {current}/{total}
                        </span>
                      </div>
                      <div className="relative h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                            isComplete
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                              : "bg-gradient-to-r from-amber-500 to-amber-600"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Why Six Bottles Modal */}
      <WhySixBottlesModal
        isOpen={showWhyModal}
        onClose={() => setShowWhyModal(false)}
      />
    </motion.div>
  );
}
