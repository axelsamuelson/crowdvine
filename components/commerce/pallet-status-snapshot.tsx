import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import type { ZoneStatusPayload } from "@/lib/pallet/zone-status";
import { cn } from "@/lib/utils";

/**
 * Server-rendered pallet fill snapshot (filled / capacity).
 * Used on PDP and list cards so status is visible without client JS.
 */
export function PalletStatusSnapshot({
  status,
  locale = "sv",
  className,
  compact = false,
}: {
  status: ZoneStatusPayload | null | undefined;
  locale?: AppLocale;
  className?: string;
  compact?: boolean;
}) {
  if (!status) {
    return (
      <p
        className={cn(
          "text-muted-foreground",
          compact ? "text-[10px] md:text-xs" : "text-sm",
          className,
        )}
      >
        {translate(locale, "product.pdp.palletLoading")}
      </p>
    );
  }

  if (status.dropState === "unavailable" && status.unavailableMessage) {
    return (
      <p
        className={cn(
          "text-muted-foreground",
          compact ? "text-[10px] md:text-xs" : "text-sm",
          className,
        )}
      >
        {status.unavailableMessage}
      </p>
    );
  }

  const filled = status.bottlesFilled;
  const total = status.minBottlesToShip || status.bottleCapacity;
  const barPercent = Math.max(
    0,
    Math.min(
      100,
      Math.round(status.shipProgressPercent ?? status.fillPercent ?? 0),
    ),
  );
  const countLabel = translate(locale, "commerce.palletFillCount", {
    filled,
    total,
  });
  const statusLabel = status.isReadyToShip
    ? translate(locale, "product.pdp.palletShipmentReady")
    : translate(locale, "product.pdp.palletBottlesToGo", {
        remaining: status.bottlesRemainingToShip,
      });

  if (compact) {
    return (
      <div className={cn("min-w-0 space-y-1", className)}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-medium text-foreground md:text-xs">
            {countLabel}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground md:text-xs">
            {status.isReadyToShip
              ? translate(locale, "commerce.palletReadyShort")
              : translate(locale, "commerce.palletRemainingShort", {
                  remaining: status.bottlesRemainingToShip,
                })}
          </span>
        </div>
        {status.showProgressBar !== false ? (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-background/90"
            role="progressbar"
            aria-valuenow={barPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={statusLabel}
          >
            <div
              className="h-full min-w-[2px] rounded-full bg-foreground"
              style={{ width: `${barPercent}%` }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("w-full min-w-0 space-y-2", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {status.displayDestination?.trim() ? (
          <p className="max-w-[9rem] shrink-0 truncate text-sm font-medium text-foreground sm:max-w-none">
            {status.displayDestination.trim()}
          </p>
        ) : null}
        {status.showProgressBar !== false ? (
          <div
            className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-background/90 shadow-inner"
            role="progressbar"
            aria-valuenow={barPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={statusLabel}
          >
            <div
              className="h-full min-w-[2px] rounded-full bg-foreground"
              style={{ width: `${barPercent}%` }}
            />
          </div>
        ) : null}
        <p className="shrink-0 text-right text-sm text-muted-foreground whitespace-nowrap">
          {countLabel}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">{statusLabel}</p>
    </div>
  );
}
