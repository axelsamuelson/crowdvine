"use client";

import Link from "next/link";
import { useCallback } from "react";

import { VisibleOnceTracker } from "@/components/analytics/visible-once-tracker";
import { usePalletZoneStatus } from "@/components/pdp/pallet-zone-status-provider";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { homeDeliveryGuidePath } from "@/lib/guides/home-delivery-guide";
import { useTranslations } from "@/lib/hooks/use-translations";

export function PalletStatusBar() {
  const { t, context } = useTranslations();
  const {
    data,
    isInitialFetch,
    isUnavailable,
    showBar,
    allowEta,
  } = usePalletZoneStatus();

  const barPercent = data?.shipProgressPercent ?? data?.fillPercent ?? 0;
  const palletDestination =
    data?.displayDestination?.trim() || data?.userZoneName?.trim() || null;
  const showDestinationLink =
    Boolean(palletDestination) && !isInitialFetch && !isUnavailable;

  const fillCountLabel =
    data && !isInitialFetch
      ? t("commerce.palletFillCount", {
          filled: data.bottlesFilled,
          total: data.minBottlesToShip || data.bottleCapacity,
        })
      : null;

  const bottlesLabel = isInitialFetch
    ? t("product.pdp.palletLoading")
    : !data
      ? t("product.pdp.palletLoadError")
      : isUnavailable && data.unavailableMessage
        ? data.unavailableMessage
        : data.isReadyToShip
          ? t("product.pdp.palletShipmentReady")
          : fillCountLabel
            ? `${fillCountLabel} · ${t("product.pdp.palletBottlesToGo", {
                remaining: data.bottlesRemainingToShip,
              })}`
            : t("product.pdp.palletBottlesToGo", {
                remaining: data.bottlesRemainingToShip,
              });

  const onPalletVisible = useCallback(() => {
    if (!data) return;
    void AnalyticsTracker.trackPalletStatusViewed({
      source: "product",
      fill_percent: barPercent,
      bottles_remaining: data.bottlesRemainingToShip,
      is_ready_to_ship: data.isReadyToShip === true,
    });
  }, [barPercent, data]);

  return (
    <VisibleOnceTracker
      onceKey={`pallet_status_viewed:${data?.userZoneName ?? "unknown"}:${Math.round(barPercent)}`}
      onVisible={onPalletVisible}
      className="w-full min-w-0 overflow-clip space-y-3"
    >
      {data && allowEta && !data.isReadyToShip ? (
        <div className="flex min-w-0 justify-end">
          <p className="text-sm text-muted-foreground">
            {t("product.pdp.palletDeliveryEta", { days: data.estimatedDays })}
          </p>
        </div>
      ) : null}

      {showBar ? (
        <div className="flex min-w-0 items-center gap-3">
          {palletDestination ? (
            showDestinationLink ? (
              <a
                href={data?.settingsUrl ?? "/settings/zone"}
                className="max-w-[9rem] shrink-0 truncate text-sm font-medium text-primary hover:underline sm:max-w-none sm:whitespace-nowrap"
              >
                {palletDestination}
              </a>
            ) : (
              <p className="max-w-[9rem] shrink-0 truncate text-sm font-medium text-foreground sm:max-w-none sm:whitespace-nowrap">
                {palletDestination}
              </p>
            )
          ) : null}
          <div
            className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-background/90 shadow-inner"
            role="progressbar"
            aria-valuenow={Math.round(barPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={bottlesLabel}
          >
            <div
              className="h-full min-w-[2px] rounded-full bg-foreground transition-all duration-300"
              style={{ width: `${barPercent}%` }}
            />
          </div>
          <p className="shrink-0 text-right text-sm text-muted-foreground whitespace-nowrap">
            {bottlesLabel}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{bottlesLabel}</p>
      )}

      {data?.logisticsFootnote ? (
        <p className="text-xs text-muted-foreground">{data.logisticsFootnote}</p>
      ) : null}
      {data?.campaignTagline ? (
        <p className="text-xs text-muted-foreground">{data.campaignTagline}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        <Link
          href={homeDeliveryGuidePath(context.locale)}
          className="underline underline-offset-4 hover:text-foreground"
        >
          {t("product.pdp.homeDeliveryGuideLink")}
        </Link>
      </p>
    </VisibleOnceTracker>
  );
}
