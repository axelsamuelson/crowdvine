"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { useTranslations } from "@/lib/hooks/use-translations";
import { producerBoxesPath } from "@/lib/producer-boxes/config";
import { cn } from "@/lib/utils";

function isRootShopPath(pathname: string): boolean {
  return pathname === "/vin" || pathname === "/wine";
}

function trackProducerBoxesCtaClick(source: string) {
  void import("@/lib/analytics/event-tracker").then(({ AnalyticsTracker }) =>
    AnalyticsTracker.trackEvent({
      eventType: "producer_boxes_cta_clicked",
      eventCategory: "navigation",
      metadata: { source },
      keepalive: true,
    }),
  );
}

export function ProducerBoxesCta({
  className,
  ssrPathname,
  variant = "button",
  analyticsSource,
}: {
  className?: string;
  ssrPathname: string;
  /** `textLink` = discreet text under the mobile filter primary CTA. */
  variant?: "button" | "textLink";
  /** Analytics metadata.source (e.g. mobile_filter_sheet). */
  analyticsSource?: string;
}) {
  const pathname = usePathname();
  const { t, context } = useTranslations();
  const isDirtywineSite = useB2BModeServerHint();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the first paint aligned with the server HTML. A click can change the
  // URL before hydration finishes, and following that live path rewrites the link.
  const activePath = mounted ? pathname : ssrPathname;
  const isRootShop = isRootShopPath(activePath);
  const href = producerBoxesPath(context.locale);

  if (isDirtywineSite) return null;

  const onNavigateClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (analyticsSource) {
      trackProducerBoxesCtaClick(analyticsSource);
    }
    if (mounted) return;
    event.preventDefault();
    window.location.assign(href);
  };

  // Mobile filter sheet: always show below "Show N wines" on every PLP
  // (root, colour, region, collection). Root-only gating was pre-existing
  // on the desktop/sidebar button variant — leave that unchanged.
  if (variant === "textLink") {
    return (
      <div className="w-full shrink-0">
        <Link
          href={href}
          onClick={onNavigateClick}
          className={cn(
            "block w-full cursor-pointer text-center text-sm font-medium text-foreground/55 underline underline-offset-4 transition-colors hover:text-foreground/80",
            className,
          )}
        >
          {t("shop.producerBoxesCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className={isRootShop ? "w-full shrink-0" : "hidden"}>
      <Button
        asChild
        className={cn(
          "h-10 whitespace-nowrap rounded-md bg-black px-3 text-sm text-white hover:bg-black/90 sm:px-4",
          className,
        )}
      >
        <Link href={href} onClick={onNavigateClick}>
          {t("shop.producerBoxesCta")}
        </Link>
      </Button>
    </div>
  );
}
