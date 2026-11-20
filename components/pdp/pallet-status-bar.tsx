"use client";

import Link from "next/link";
import { useCallback } from "react";

import { VisibleOnceTracker } from "@/components/analytics/visible-once-tracker";
import { DirectBoxDeliveryPromise } from "@/components/commerce/direct-box-delivery-promise";
import { PactSellerConsumerInfo } from "@/components/commerce/pact-seller-consumer-info";
import { usePalletZoneStatus } from "@/components/pdp/pallet-zone-status-provider";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { homeDeliveryGuidePath } from "@/lib/guides/home-delivery-guide";
import { useTranslations } from "@/lib/hooks/use-translations";
import { formatPalletDeliveryWhen } from "@/lib/pdp/pallet-delivery-when";

/**
 * PDP delivery strip. Fill numbers come from the client zone-status fetch,
 * not the ISR snapshot. Still emits `pallet_status_viewed` for funnel analytics.
 */
export function PalletStatusBar({
  sourceType,
  showDirectBoxPromise = false,
  showSharedPalletPromise = false,
}: {
  sourceType?: string | null;
  /** Pass from server via isDirectBoxCheckoutEnabled() — env is not on the client. */
  showDirectBoxPromise?: boolean;
  /** PACT wine PDP: shared-pallet delivery line next to direct-box row. */
  showSharedPalletPromise?: boolean;
}) {
  const { t, context } = useTranslations();
  const isDirtywineSite = useB2BModeServerHint();
  const { data, isUnavailable, hasLiveData } = usePalletZoneStatus();

  const barPercent = data?.shipProgressPercent ?? data?.fillPercent ?? 0;

  const onPalletVisible = useCallback(() => {
    // Keep event even when UI no longer shows fill — metadata stays internal.
    void AnalyticsTracker.trackPalletStatusViewed({
      source: "product",
      fill_percent: data ? barPercent : undefined,
      bottles_remaining: data?.bottlesRemainingToShip,
      is_ready_to_ship: data?.isReadyToShip === true,
    });
  }, [barPercent, data]);

  const unavailableMessage =
    isUnavailable && data?.unavailableMessage ? data.unavailableMessage : null;

  const livePallet =
    hasLiveData && data?.palletResolved === true && data.minBottlesToShip > 0
      ? data
      : null;
  const showFill = livePallet != null && livePallet.shipProgressPercent >= 25;
  const deliveryWhen = livePallet
    ? formatPalletDeliveryWhen(
        {
          expected: livePallet.deliveryExpectedDate,
          start: livePallet.deliveryWindowStart,
          end: livePallet.deliveryWindowEnd,
        },
        context.locale === "en" ? "en" : "sv",
      )
    : null;

  return (
    <VisibleOnceTracker
      onceKey={`pallet_status_viewed:direct_box:${data?.userZoneName ?? "anon"}:${Math.round(barPercent)}`}
      onVisible={onPalletVisible}
      className="w-full min-w-0 overflow-clip space-y-2"
    >
      {unavailableMessage ? (
        <p className="text-sm text-muted-foreground">{unavailableMessage}</p>
      ) : (
        <DirectBoxDeliveryPromise
          locale={context.locale}
          sourceType={sourceType}
          enabled={showDirectBoxPromise}
        />
      )}
      {showSharedPalletPromise && !isDirtywineSite ? (
        livePallet ? (
          <div className="space-y-2">
            <p
              className="text-sm text-muted-foreground"
              data-testid="pact-shared-pallet-line"
            >
              {t("commerce.sharedPalletDeliveryWhenBooked", {
                minBottlesToShip: livePallet.minBottlesToShip,
              })}
            </p>
            {showFill ? (
              <div className="space-y-1">
                <div
                  className="h-1 w-full overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={t("commerce.palletBookedCount", {
                    filled: livePallet.bottlesFilled,
                    total: livePallet.minBottlesToShip,
                  })}
                >
                  <div
                    className="h-full bg-foreground"
                    style={{
                      width: `${Math.min(100, Math.max(0, livePallet.shipProgressPercent))}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("commerce.palletBookedCount", {
                    filled: livePallet.bottlesFilled,
                    total: livePallet.minBottlesToShip,
                  })}
                </p>
              </div>
            ) : null}
            {deliveryWhen ? (
              <p className="text-sm text-muted-foreground">
                {t("commerce.estimatedDelivery", { when: deliveryWhen })}
              </p>
            ) : null}
          </div>
        ) : (
          <PactSellerConsumerInfo
            locale={context.locale}
            showSeller={false}
            showWithdrawal={false}
            showSharedPallet
          />
        )
      ) : null}
      {!isDirtywineSite ? (
        <p className="text-xs text-muted-foreground">
          <Link
            href={homeDeliveryGuidePath(context.locale)}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("product.pdp.homeDeliveryGuideLink")}
          </Link>
        </p>
      ) : null}
    </VisibleOnceTracker>
  );
}
