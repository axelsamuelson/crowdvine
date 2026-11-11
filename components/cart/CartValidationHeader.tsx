"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  cartMinimumTrackingMeta,
  type ProducerValidation,
} from "@/lib/checkout-validation";
import { WhySixBottlesTrigger } from "./WhySixBottlesModal";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { emitOnce } from "@/lib/analytics/emit-once";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  formatPackingSourceCustomerLabel,
  fullBoxCountFromBottles,
} from "@/lib/cart/packing-source-display";
import { PACK_BOTTLES_PER_SOURCE } from "@/lib/cart/packing-source";

interface CartValidationHeaderProps {
  validations: ProducerValidation[];
  isValidating: boolean;
  /** Shared counters from `/api/cart/validate` when available. */
  requiredQuantity?: number;
  neededTotal?: number;
}

function sourceLabel(
  validation: ProducerValidation,
  locale: "sv" | "en",
): string {
  if (validation.sourceKind === "wholesaler") {
    return formatPackingSourceCustomerLabel({
      kind: "wholesaler",
      regions: validation.regions,
      locale,
    });
  }
  if (validation.scope === "cart") {
    return "";
  }
  return formatPackingSourceCustomerLabel({
    kind: "producer",
    producerName:
      validation.producerDisplayName || validation.producerName || "",
    locale,
  });
}

function BottleProgressRow({
  validation,
  locale,
}: {
  validation: ProducerValidation;
  locale: "sv" | "en";
}) {
  const { t } = useTranslations();
  const current = validation.quantity || 0;
  const needed = validation.needed || 0;
  const total =
    validation.required ??
    (current + needed || PACK_BOTTLES_PER_SOURCE);
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const isComplete = validation.isValid;
  const boxes = Math.max(
    1,
    fullBoxCountFromBottles(isComplete ? current : total),
  );
  const label = sourceLabel(validation, locale);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground font-medium truncate">
          {label || t("cart.bottleProgressHint")}
        </span>
        <span className="text-xs font-semibold tabular-nums shrink-0 text-foreground">
          {isComplete
            ? t("cart.bottleProgressFull", {
                current,
                total: current,
                boxes,
              })
            : t("cart.bottleProgress", { current, total })}
        </span>
      </div>
      <div className="relative h-2 bg-foreground/[0.08] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#0A0A0A] transition-all duration-500 ease-out"
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
  const { t, context } = useTranslations();
  const locale = context.locale === "en" ? "en" : "sv";
  const shownRef = useRef(false);
  const passedRef = useRef(false);
  const failedRef = useRef(false);

  const allValid = validations.every((v) => v.isValid);
  const invalidCount = validations.filter((v) => !v.isValid).length;
  const isCartScoped = validations.some((v) => v.scope === "cart");
  const fullCount = validations.filter((v) => v.isValid).length;
  const sourceCount = validations.length;

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
    if (validations.length === 0) return;

    const bottlesInCart = validations.reduce(
      (s, v) => s + (v.quantity || 0),
      0,
    );
    if (bottlesInCart > 0) {
      emitOnce("six_pack_rule_viewed:cart", () => {
        void AnalyticsTracker.trackEvent({
          eventType: "six_pack_rule_viewed",
          eventCategory: "engagement",
          metadata: { surface: "cart" },
        });
      });
    }

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
            <WhySixBottlesTrigger />
          </div>
        </div>
      </motion.div>
    );
  }

  // Legacy cart-total scoped progress (pre six-per-source).
  if (isCartScoped) {
    const current = validations.reduce((s, v) => s + (v.quantity || 0), 0);
    const total = requiredQuantity || PACK_BOTTLES_PER_SOURCE;
    const needed = totalNeeded || Math.max(0, total - current);
    const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    const boxes = Math.max(1, fullBoxCountFromBottles(current || total));

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 md:px-4 mb-2"
      >
        <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {allValid
                ? t("cart.bottleProgressFull", {
                    current,
                    total: current,
                    boxes,
                  })
                : t("cart.bottleProgress", { current, total })}
            </span>
            <WhySixBottlesTrigger />
          </div>
          <div className="relative h-1.5 bg-foreground/[0.08] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#0A0A0A] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {!allValid ? (
            <p className="text-[11px] text-muted-foreground">
              {t("cart.needMoreMixHint", { needed })}
            </p>
          ) : null}
        </div>
      </motion.div>
    );
  }

  const ordered = [
    ...validations.filter((v) => !v.isValid),
    ...validations.filter((v) => v.isValid),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 md:px-4 mb-2"
    >
      <div className="bg-background/95 backdrop-blur-md border border-border/30 rounded-lg p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-semibold text-foreground tabular-nums flex items-center gap-1.5">
              {allValid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-foreground/70 shrink-0" />
              ) : null}
              {t("cart.fullBoxesSummary", {
                full: fullCount,
                total: sourceCount,
              })}
            </p>
            {!allValid && totalNeeded > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {t("cart.needMoreBottlesShort", { needed: totalNeeded })}
              </p>
            ) : null}
          </div>
          <WhySixBottlesTrigger />
        </div>

        <div className="space-y-2.5">
          {ordered.map((validation) => (
            <BottleProgressRow
              key={`${validation.scope || "row"}-${validation.producerId}-${validation.producerHandle}`}
              validation={validation}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
