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

/**
 * PDP delivery strip: customer sees direct-box promise (not pallet fill).
 * Still emits `pallet_status_viewed` with fill metadata for funnel analytics.
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
  const { data, isUnavailable } = usePalletZoneStatus();

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
    isUnavailable && data?.unavailableMessage
      ? data.unavailableMessage
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
        <PactSellerConsumerInfo
          locale={context.locale}
          showSeller={false}
          showWithdrawal={false}
          showSharedPallet
        />
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
