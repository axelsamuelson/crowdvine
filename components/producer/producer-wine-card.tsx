import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/locale";
import { productPublicPath } from "@/lib/i18n/localized-routes";

import { wineColorDotClass } from "@/lib/wine-color";
import { formatPrice } from "@/lib/shopify/utils";
import { cn } from "@/lib/utils";

export type ProducerWineCardWine = {
  id: string;
  wine_name: string;
  vintage: string | null;
  handle: string;
  price_sek: number;
  summary: string | null;
  description?: string | null;
  color?: string | null;
  type?: string | null;
};

type ProducerWineCardProps = {
  wine: ProducerWineCardWine;
  intlLocale: string;
};

function localeFromIntl(intlLocale: string): AppLocale {
  return intlLocale.startsWith("sv") ? "sv" : "en";
}

export function ProducerWineCard({ wine, intlLocale }: ProducerWineCardProps) {
  const blurb = wine.summary ?? wine.description ?? null;
  const color = wine.color ?? wine.type ?? null;
  const productHref = productPublicPath(
    wine.handle,
    localeFromIntl(intlLocale),
  );

  return (
    <Link
      href={productHref}
      className={cn(
        "block rounded-xl border bg-background p-4 transition-colors",
        "hover:border-foreground/30 hover:bg-muted/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        {color ? (
          <span
            className={cn(
              "mt-1.5 h-3 w-3 shrink-0 rounded-full",
              wineColorDotClass(color),
            )}
            aria-hidden
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {wine.wine_name}
            {wine.vintage ? ` ${wine.vintage}` : ""}
          </p>
          {blurb ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {blurb}
            </p>
          ) : null}
          <p className="mt-3 text-sm font-semibold text-foreground">
            {formatPrice(wine.price_sek, "SEK", intlLocale)}
          </p>
        </div>
      </div>
    </Link>
  );
}
