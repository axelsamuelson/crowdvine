import {
  ProducerWineList,
  type ProducerWineListItem,
} from "@/components/producer/producer-wine-list";
import type { AppLocale } from "@/lib/i18n/locale";
import type { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

interface PdpSiblingWinesSectionProps {
  producerName: string;
  locale: AppLocale;
  wines: Product[];
  className?: string;
}

function siblingHeading(producerName: string, locale: AppLocale): string {
  const name = producerName.trim();
  return locale === "sv"
    ? `Fler viner från ${name}`
    : `More wines from ${name}`;
}

function productToWineListItem(product: Product): ProducerWineListItem {
  const title = product.title.trim();
  const vintageMatch = title.match(/\s((?:19|20)\d{2})$/);
  const amount = Number(product.priceRange.minVariantPrice.amount);
  return {
    id: product.id,
    wine_name: vintageMatch
      ? title.slice(0, vintageMatch.index).trim() || title
      : title,
    vintage: vintageMatch?.[1] ?? null,
    handle: product.handle,
    price_sek: Number.isFinite(amount) ? amount : 0,
    summary: null,
    color: product.wineEnrichment?.color ?? null,
  };
}

/**
 * Server-rendered sibling wine rows for SEO internal linking.
 * Same row pattern as the public producer page wine list.
 */
export function PdpSiblingWinesSection({
  producerName,
  locale,
  wines,
  className,
}: PdpSiblingWinesSectionProps) {
  if (wines.length === 0 || !producerName.trim()) return null;

  const items = wines.map(productToWineListItem);
  const emptyMessage =
    locale === "sv" ? "Inga andra viner just nu." : "No other wines right now.";

  return (
    <section
      className={cn("col-span-full w-full bg-muted px-sides py-8", className)}
      aria-label={siblingHeading(producerName, locale)}
    >
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        {siblingHeading(producerName, locale)}
      </h2>
      <ProducerWineList
        wines={items}
        locale={locale}
        emptyMessage={emptyMessage}
        hideColorGroups
      />
    </section>
  );
}
