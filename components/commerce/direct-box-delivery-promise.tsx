import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import {
  B2C_DIRECT_BOX_DELIVERY_TIME_TODO,
  DIRECT_BOX_DELIVERY_MESSAGE_KEY,
  isProducerSourcedWine,
} from "@/lib/commerce/direct-box-delivery";
import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";
import { cn } from "@/lib/utils";

/**
 * Customer-facing B2C delivery promise: direct box from producer.
 * Hidden unless DIRECT_BOX_CHECKOUT_ENABLED (same gate as checkout direct row).
 * No pallet fill / capacity. Optional time string only via marked TODO constant.
 */
export function DirectBoxDeliveryPromise({
  locale = "sv",
  className,
  compact = false,
  sourceType,
  enabled,
}: {
  locale?: AppLocale;
  className?: string;
  compact?: boolean;
  sourceType?: string | null;
  /** Override; defaults to DIRECT_BOX_CHECKOUT_ENABLED. */
  enabled?: boolean;
}) {
  const show =
    enabled !== undefined ? enabled : isDirectBoxCheckoutEnabled();
  if (!show) return null;
  if (!isProducerSourcedWine(sourceType)) return null;

  const promise = translate(locale, DIRECT_BOX_DELIVERY_MESSAGE_KEY);
  const timeTodo = B2C_DIRECT_BOX_DELIVERY_TIME_TODO?.trim() || null;

  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "text-muted-foreground",
          compact ? "text-[10px] leading-tight md:text-xs" : "text-sm",
        )}
      >
        {promise}
        {timeTodo ? (
          <span className="block text-muted-foreground/80">{timeTodo}</span>
        ) : null}
      </p>
    </div>
  );
}
