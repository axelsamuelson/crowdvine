"use client";

import { motion } from "motion/react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ProducerValidation } from "@/lib/checkout-validation";
import { WhySixBottlesModal } from "./WhySixBottlesModal";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { useTranslations } from "@/lib/hooks/use-translations";

interface CartValidationHeaderProps {
  validations: ProducerValidation[];
  isValidating: boolean;
}

function BottleProgressRow({
  validation,
}: {
  validation: ProducerValidation;
}) {
  const { t } = useTranslations();
  const current = validation.quantity || 0;
  const needed = validation.needed || 0;
  const total = current + needed || 6;
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const isComplete = validation.isValid;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground font-medium truncate">
          {validation.producerName}
        </span>
        <span
          className={`text-xs font-semibold tabular-nums shrink-0 ${
            isComplete ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {isComplete
            ? t("cart.bottleProgress", { current, total: current || 6 })
            : t("cart.bottleProgress", { current, total })}
        </span>
      </div>
      <div className="relative h-2 bg-foreground/[0.08] rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
            isComplete
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : "bg-gradient-to-r from-amber-500 to-amber-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {!isComplete ? (
        <p className="text-[11px] text-amber-800/90">
          {t("cart.needMoreBottlesShort", { needed })}
        </p>
      ) : null}
    </div>
  );
}

export function CartValidationHeader({
  validations,
  isValidating,
}: CartValidationHeaderProps) {
  const { t } = useTranslations();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const shownRef = useRef(false);
  const passedRef = useRef(false);
  const failedRef = useRef(false);

  const allValid = validations.every((v) => v.isValid);
  const invalidCount = validations.filter((v) => !v.isValid).length;
  const totalNeeded = validations.reduce(
    (sum, v) => sum + (v.isValid ? 0 : v.needed),
    0,
  );

  useEffect(() => {
    if (isValidating) return;
    if (validations.length === 0) return;

    const neededTotal = validations.reduce(
      (sum, v) => sum + (v.isValid ? 0 : v.needed),
      0,
    );

    const requiredQuantity = validations.reduce(
      (sum, v) => sum + (v.quantity || 0) + (v.isValid ? 0 : v.needed),
      0,
    );

    if (!shownRef.current) {
      shownRef.current = true;
      void AnalyticsTracker.trackEvent({
        eventType: "cart_validation_shown",
        eventCategory: "validation",
        metadata: {
          invalid_count: invalidCount,
          needed_total: neededTotal,
          required_quantity: requiredQuantity,
        },
      });
    }

    if (invalidCount === 0 && !passedRef.current) {
      passedRef.current = true;
      void AnalyticsTracker.trackEvent({
        eventType: "cart_validation_passed",
        eventCategory: "validation",
        metadata: {
          invalid_count: 0,
          needed_total: 0,
          required_quantity: requiredQuantity,
        },
      });
    } else if (invalidCount > 0 && !failedRef.current) {
      failedRef.current = true;
      void AnalyticsTracker.trackEvent({
        eventType: "cart_validation_failed",
        eventCategory: "validation",
        metadata: {
          invalid_count: invalidCount,
          needed_total: neededTotal,
          required_quantity: requiredQuantity,
          reason: "minimum_bottle_count",
        },
      });
    }
  }, [isValidating, validations, invalidCount]);

  // Expand by default whenever there are blocking errors.
  useEffect(() => {
    if (invalidCount > 0) setIsExpanded(true);
  }, [invalidCount]);

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
              {t("cart.validatingCart")}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (allValid && validations.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 md:px-4 mb-2"
      >
        <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">
                {t("cart.readyToCheckout")}
              </span>
            </div>
            <button
              onClick={() => {
                setShowWhyModal(true);
                AnalyticsTracker.trackEvent({
                  eventType: "why_modal_opened",
                  eventCategory: "engagement",
                });
              }}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors min-h-9 px-1"
              title={t("cart.whySixAria")}
            >
              {t("cart.why")}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("cart.bottleProgressHint")}
          </p>
        </div>

        <WhySixBottlesModal
          isOpen={showWhyModal}
          onClose={() => setShowWhyModal(false)}
        />
      </motion.div>
    );
  }

  if (validations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 md:px-4 mb-2"
      >
        <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-lg p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="text-xs text-muted-foreground">
                {t("cart.learnSixBottleRule")}
              </span>
            </div>
            <button
              onClick={() => {
                setShowWhyModal(true);
                AnalyticsTracker.trackEvent({
                  eventType: "why_modal_opened",
                  eventCategory: "engagement",
                });
              }}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors min-h-9 px-1 shrink-0"
              title={t("cart.whySixAria")}
            >
              {t("cart.why")}
            </button>
          </div>
        </div>

        <WhySixBottlesModal
          isOpen={showWhyModal}
          onClose={() => setShowWhyModal(false)}
        />
      </motion.div>
    );
  }

  const invalidValidations = validations.filter((v) => !v.isValid);
  const validValidations = validations.filter((v) => v.isValid);
  const allValidations = [...invalidValidations, ...validValidations];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 md:px-4 mb-2"
    >
      <div className="bg-amber-50/90 dark:bg-amber-950/30 backdrop-blur-md border border-amber-200/60 rounded-lg p-3">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                {invalidValidations.length === 1
                  ? t("cart.oneProducerNeedsMore", {
                      needed: invalidValidations[0].needed,
                    })
                  : t("cart.producersNeedMore", {
                      count: invalidValidations.length,
                    })}
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-200/80">
                {t("cart.bottleProgressHint")}
                {totalNeeded > 0
                  ? ` · ${t("cart.needMoreBottlesShort", { needed: totalNeeded })}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setShowWhyModal(true);
                  AnalyticsTracker.trackEvent({
                    eventType: "why_modal_opened",
                    eventCategory: "engagement",
                  });
                }}
                className="text-xs text-amber-800/70 hover:text-amber-900 transition-colors min-h-9 px-1"
                title={t("cart.whySixAria")}
              >
                {t("cart.why")}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-amber-100/80 rounded transition-colors min-h-9 min-w-9"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-amber-800" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-amber-800" />
                )}
              </button>
            </div>
          </div>

          {isExpanded ? (
            <div className="space-y-2.5 pt-1">
              {allValidations.map((validation) => (
                <BottleProgressRow
                  key={validation.producerHandle}
                  validation={validation}
                />
              ))}
              <p className="text-[11px] text-muted-foreground">
                {t("cart.mixFreelyWithinProducer")}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <WhySixBottlesModal
        isOpen={showWhyModal}
        onClose={() => setShowWhyModal(false)}
      />
    </motion.div>
  );
}
