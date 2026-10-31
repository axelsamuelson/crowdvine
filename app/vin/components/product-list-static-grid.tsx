import Link from "next/link";

import { ServerListPrice } from "@/components/commerce/server-list-price";
import { ProductListImageServer } from "@/app/vin/components/product-list-image-server";
import { ProductGrid } from "@/app/vin/components/product-grid";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import type { Product } from "@/lib/shopify/types";

function productHref(handle: string, locale: AppLocale): string {
  return locale === "en" ? `/product/${handle}` : `/produkt/${handle}`;
}

function producerRegionLine(product: Product): string | null {
  const producer = product.producerName?.trim() || null;
  const region =
    product.producerLocation?.subregion?.trim() ||
    product.producerLocation?.region?.trim() ||
    null;
  if (producer && region) return `${producer} · ${region}`;
  return producer || region;
}

function ProductListStaticCard({
  product,
  index,
  locale,
}: {
  product: Product;
  index: number;
  locale: AppLocale;
}) {
  const href = productHref(product.handle, locale);
  const meta = producerRegionLine(product);
  const viewWine = translate(locale, "shop.viewWine");

  return (
    <article className="w-full min-w-0">
      <Link
        href={href}
        className="group flex w-full min-w-0 flex-col focus-visible:outline-none"
        prefetch={false}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          <ProductListImageServer
            product={product}
            priority={index < 3}
            index={index}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-0.5 px-3 pt-2 md:px-1">
          <p className="line-clamp-2 text-sm leading-snug text-foreground">
            {product.title}
          </p>
          {meta ? (
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
          ) : null}
          <ServerListPrice
            product={product}
            locale={locale}
            className="text-sm font-medium tabular-nums"
          />
          <span className="mt-1.5 hidden h-11 w-full items-center justify-center rounded-md border border-foreground bg-transparent text-sm font-medium text-foreground transition-colors group-hover:bg-foreground group-hover:text-background md:inline-flex">
            {viewWine}
          </span>
        </div>
      </Link>
    </article>
  );
}

/** Server-rendered PLP grid — image + compact info below (no image overlay). */
export function ProductListStaticGrid({
  products,
  locale,
}: {
  products: Product[];
  locale: AppLocale;
}) {
  return (
    <ProductGrid>
      {products.map((product, index) => (
        <ProductListStaticCard
          key={product.id}
          product={product}
          index={index}
          locale={locale}
        />
      ))}
    </ProductGrid>
  );
}
