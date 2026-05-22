"use client";

import { CartItem } from "@/lib/shopify/types";
import { Button } from "../ui/button";
import { useCart } from "./cart-context";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { useTranslations } from "@/lib/hooks/use-translations";

export function DeleteItemButton({ item }: { item: CartItem }) {
  const { t } = useTranslations();
  const { updateItem } = useCart();
  const lineId = item.id;
  const merchandiseId = item.merchandise.id;

  return (
    <form
      className="-mr-1 -mb-1 opacity-70"
      onSubmit={(e) => {
        e.preventDefault();
        void AnalyticsTracker.trackEvent({
          eventType: "remove_from_cart",
          eventCategory: "cart",
          metadata: { lineId, merchandiseId },
        });
        updateItem(lineId, merchandiseId, 0, "delete");
      }}
    >
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        aria-label={t("cart.removeAria")}
        className="px-2 text-sm"
      >
        {t("cart.remove")}
      </Button>
    </form>
  );
}
