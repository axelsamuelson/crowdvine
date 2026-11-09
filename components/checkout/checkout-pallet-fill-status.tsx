"use client";

/**
 * Discreet shared-pallet fill status on checkout (CRO).
 * Absolute numbers + thin progress bar; no delivery-time copy.
 * Hidden entirely when fill data is missing/stale.
 * Fires `pallet_status_viewed` once per view via VisibleOnceTracker.
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

export type CheckoutPalletFillStatusProps = CheckoutPalletFillInput & {
  locale: DualOfferUiLocale;
  /** Default true — flip false for CRO hide without unmounting wiring. */
  enabled?: boolean;
  className?: string;
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
    });
  }, [display]);

  if (!display) return null;

  const label = dualOfferMsg(
    props.locale,
    display.useOpenedCopy
      ? "dualOfferPalletFillOpened"
      : "dualOfferPalletFillStatus",
    {
      filled: String(display.fillCount),
      total: String(display.capacity),
    },
  );

  return (
    <VisibleOnceTracker
      onceKey={`pallet_status_viewed:checkout:${display.palletId}:${display.fillCount}:${display.capacity}`}
      onVisible={onVisible}
      className={props.className}
      threshold={0.25}
    >
      <div
        className="space-y-1.5"
        data-testid="dual-offer-pallet-fill"
        data-includes-cart={display.includesCustomerCart ? "1" : "0"}
      >
        <p className="text-sm text-foreground/80 leading-snug whitespace-nowrap overflow-hidden text-ellipsis max-[374px]:whitespace-normal">
          {label}
        </p>
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
      </div>
    </VisibleOnceTracker>
  );
}
