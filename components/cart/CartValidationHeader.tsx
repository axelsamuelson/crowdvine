"use client";

import { motion } from "motion/react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  cartMinimumTrackingMeta,
  type ProducerValidation,
} from "@/lib/checkout-validation";
import { WhySixBottlesModal } from "./WhySixBottlesModal";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { emitOnce } from "@/lib/analytics/emit-once";
import { useTranslations } from "@/lib/hooks/use-translations";
import { producerDisplayName } from "@/lib/producer-display-name";

interface CartValidationHeaderProps {
  validations: ProducerValidation[];
  isValidating: boolean;
  /** Shared counters from `/api/cart/validate` when available. */
  requiredQuantity?: number;
  neededTotal?: number;
}

function BottleProgressRow({
  validation,
}: {
  validation: ProducerValidation;
}) {
  const { t } = useTranslations();
  const current = validation.quantity || 0;
  const needed = validation.needed || 0;
  const total =
    validation.required ??
    (current + needed || 6);
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const isComplete = validation.isValid;
  const shownProducer = producerDisplayName({
    name: validation.producerName,
    display_name: validation.producerDisplayName,
  });
  const label =
    validation.scope === "cart" || !shownProducer
      ? t("cart.bottleProgressHint")
      : shownProducer;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground font-medium truncate">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums shrink-0 text-foreground">
          {isComplete
            ? t("cart.bottleProgressFull", {
                current: current || 6,
                total: current || 6,
              })
            : t("cart.bottleProgress", { current, total })}
        </span>
      </div>
      <div className="relative h-2 bg-foreground/[0.08] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground/35 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {!isComplete ? (
        <p className="text-[11px] text-muted-foreground">
          {t("cart.needMoreBottlesShort", { needed })}
        </p>
      ) : null}
    </div>
  );
}

export function CartValidationHeader({
  validations,
  isValidating,
  requiredQuantity: requiredQuantityProp,
  neededTotal: neededTotalProp,
}: CartValidationHeaderProps) {
  const { t } = useTranslations();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const shownRef = useRef(false);
  const passedRef = useRef(false);
  const failedRef = useRef(false);

  const allValid = validations.every((v) => v.isValid);
  const invalidCount = validations.filter((v) => !v.isValid).length;
  const isCartScoped = validations.some((v) => v.scope === "cart");

  const derivedNeeded = validations.reduce(
    (sum, v) => sum + (v.isValid ? 0 : v.needed),
    0,
  );
  const derivedRequired = validations.reduce(
    (sum, v) =>
      sum +
      (v.required ??
        (v.quantity || 0) + (v.isValid ? 0 : v.needed || 0)),
    0,
  );
  const totalNeeded =
    typeof neededTotalProp === "number" ? neededTotalProp : derivedNeeded;
  const requiredQuantity =
    typeof requiredQuantityProp === "number"
      ? requiredQuantityProp
      : derivedRequired;

  useEffect(() => {
    if (isValidating) return;

    // Cart progress / empty educational header both surface the 6-bottle rule.
    emitOnce("six_pack_rule_viewed:cart", () => {
      void AnalyticsTracker.trackEvent({
        eventType: "six_pack_rule_viewed",
        eventCategory: "engagement",
        metadata: { surface: "cart" },
      });
    });

    if (validations.length === 0) return;

    const tracking = cartMinimumTrackingMeta(
      {
        channel: isCartScoped ? "b2c" : "b2b",
        quantity: validations.reduce((s, v) => s + (v.quantity || 0), 0),
        required: requiredQuantity,
        needed: totalNeeded,
        isValid: invalidCount === 0,
      },
      { invalidCount },
    );

    if (!shownRef.current) {
      shownRef.current = true;
      void AnalyticsTracker.trackEvent({
        eventType: "cart_validation_shown",
        eventCategory: "validation",
        metadata: {
          invalid_count: tracking.invalid_count,
          needed_total: tracking.needed_total,
          required_quantity: tracking.required_quantity,
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
          required_quantity: tracking.required_quantity,
        },
      });
    } else if (invalidCount > 0 && !failedRef.current) {
      failedRef.current = true;
      void AnalyticsTracker.trackEvent({
        eventType: "cart_validation_failed",
        eventCategory: "validation",
        metadata: {
          invalid_count: tracking.invalid_count,
          needed_total: tracking.needed_total,
          required_quantity: tracking.required_quantity,
          reason: "minimum_bottle_count",
        },
      });
    }
  }, [
    isValidating,
    validations,
    invalidCount,
    requiredQuantity,
    totalNeeded,
    isCartScoped,
  ]);

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
    const totalBottles = validations.reduce((s, v) => s + (v.quantity || 0), 0);
    const fullTotal = requiredQuantity || totalBottles || 6;
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 md:px-4 mb-2"
      >
        <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" />
              <span className="text-xs text-foreground font-medium">
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
          <p className="text-xs font-medium text-foreground tabular-nums">
            {t("cart.bottleProgressFull", {
              current: Math.min(totalBottles, fullTotal) || fullTotal,
              total: fullTotal,
            })}
          </p>
          <div className="relative h-2 bg-foreground/[0.08] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 w-full rounded-full bg-foreground/35"
              aria-hidden
            />
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
      <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-lg p-3">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {isCartScoped
                  ? t("cart.needMoreBottlesShort", {
                      needed: totalNeeded || invalidValidations[0]?.needed || 0,
                    })
                  : invalidValidations.length === 1
                    ? t("cart.oneProducerNeedsMore", {
                        needed: invalidValidations[0].needed,
                      })
                    : t("cart.producersNeedMore", {
                        count: invalidValidations.length,
                      })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("cart.bottleProgressHint")}
                {!isCartScoped && totalNeeded > 0
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
                className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors min-h-9 px-1"
                title={t("cart.whySixAria")}
              >
                {t("cart.why")}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-muted rounded transition-colors min-h-9 min-w-9"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-foreground/70" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-foreground/70" />
                )}
              </button>
            </div>
          </div>

          {isExpanded ? (
            <div className="space-y-2.5 pt-1">
              {allValidations.map((validation) => (
                <BottleProgressRow
                  key={`${validation.scope || "row"}-${validation.producerId}-${validation.producerHandle}`}
                  validation={validation}
                />
              ))}
              <p className="text-[11px] text-muted-foreground">
                {isCartScoped
                  ? t("cart.mixFreelyCart")
                  : t("cart.mixFreelyWithinProducer")}
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
