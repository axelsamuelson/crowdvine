"use client";

/**
 * Discreet shared-pallet fill status on checkout (CRO).
 * Always shows count text; progress bar only when fill >= PALLET_BAR_MIN_FILL.
 * Fires `pallet_status_viewed` once per view via VisibleOnceTracker (includes show_bar).
 */

import { useCallback } from "react";
import { VisibleOnceTracker } from "@/components/analytics/visible-once-tracker";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import {
  dualOfferMsg,
  type DualOfferUiLocale,
} from "@/lib/checkout/dual-offer-customer-copy";
import {
  resolveCheckoutPalletFillDisplay,
  type CheckoutPalletFillInput,
} from "@/lib/checkout/pallet-fill-display";
import {
  coverageCheckoutHint,
  coverageProgressLabel,
} from "@/lib/pallet-coverage-close/customer-copy";

export type CheckoutPalletFillStatusProps = CheckoutPalletFillInput & {
  locale: DualOfferUiLocale;
  /** Default true — flip false for CRO hide without unmounting wiring. */
  enabled?: boolean;
  className?: string;
  /**
   * Coverage-close: show TODO(Juliette/Margaux) placeholders and treat
   * `capacity` as bottles needed for the current threshold (Y).
   */
  useCoverageCloseCopy?: boolean;
};

export function CheckoutPalletFillStatus(props: CheckoutPalletFillStatusProps) {
  const enabled = props.enabled !== false;
  const display = enabled
    ? resolveCheckoutPalletFillDisplay({
        palletId: props.palletId,
        reservedBottles: props.reservedBottles,
        capacity: props.capacity,
        cartBottles: props.cartBottles,
        fillAvailable: props.fillAvailable,
      })
    : null;

  const onVisible = useCallback(() => {
    if (!display) return;
    void AnalyticsTracker.trackPalletStatusViewed({
      source: "checkout",
      fill_count: display.fillCount,
      capacity: display.capacity,
      pallet_id: display.palletId,
      fill_percent: display.fillPercent,
      show_bar: display.showBar,
    });
  }, [display]);

  if (!display) return null;

  const locale = props.locale === "en" ? "en" : "sv";
  const label = props.useCoverageCloseCopy
    ? coverageProgressLabel({
        locale,
        filled: display.fillCount,
        target: display.capacity,
      })
    : dualOfferMsg(props.locale, "dualOfferPalletFillStatus", {
        filled: String(display.fillCount),
        total: String(display.capacity),
      });
  const hint = props.useCoverageCloseCopy
    ? coverageCheckoutHint(locale)
    : null;

  return (
    <VisibleOnceTracker
      onceKey={`pallet_status_viewed:checkout:${display.palletId}:${display.fillCount}:${display.capacity}:${display.showBar ? "bar" : "nobar"}:${props.useCoverageCloseCopy ? "cov" : "leg"}`}
      onVisible={onVisible}
      className={props.className}
      threshold={0.25}
    >
      <div
        className="space-y-1.5"
        data-testid="dual-offer-pallet-fill"
        data-includes-cart={display.includesCustomerCart ? "1" : "0"}
        data-show-bar={display.showBar ? "1" : "0"}
        data-coverage-close={props.useCoverageCloseCopy ? "1" : "0"}
      >
        <p className="text-sm text-foreground/80 leading-snug whitespace-nowrap overflow-hidden text-ellipsis max-[374px]:whitespace-normal">
          {label}
        </p>
        {hint ? (
          <p className="text-xs text-muted-foreground leading-snug">{hint}</p>
        ) : null}
        {display.showBar ? (
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-foreground/10"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-foreground/55 transition-[width] duration-500"
              style={{ width: `${display.fillPercent}%` }}
              data-testid="dual-offer-pallet-fill-bar"
            />
          </div>
        ) : null}
      </div>
    </VisibleOnceTracker>
  );
}
