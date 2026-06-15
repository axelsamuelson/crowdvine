import Link from "next/link";

import { ProductListImageServer } from "@/app/vin/components/product-list-image-server";
import { ProductGrid } from "@/app/vin/components/product-grid";
import type { AppLocale } from "@/lib/i18n/locale";
import { formatPrice } from "@/lib/shopify/utils";
import type { Product } from "@/lib/shopify/types";

function productHref(handle: string, locale: AppLocale): string {
  return locale === "en" ? `/product/${handle}` : `/produkt/${handle}`;
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
  const price = product.priceRange.minVariantPrice;
  const intlLocale = locale === "en" ? "en-SE" : "sv-SE";

  return (
    <div className="relative w-full overflow-visible">
      <div
        className="relative z-10 w-full aspect-[3/4] md:aspect-square bg-muted group"
        style={{ clipPath: "inset(0)" }}
      >
        <div className="relative size-full overflow-clip">
          <Link href={href} className="block size-full focus-visible:outline-none" prefetch>
            <ProductListImageServer
              product={product}
              priority={index < 3}
              index={index}
            />
          </Link>
        </div>

        <div className="absolute inset-0 pl-1 pr-2 pt-2 pb-2 md:p-2 w-full pointer-events-none">
          <div className="flex gap-2 md:gap-6 justify-between items-start md:items-baseline px-1 md:px-3 py-1 w-full font-semibold">
            <div className="flex flex-col min-w-0 max-w-[42%] md:max-w-[40%] shrink md:shrink-0 overflow-hidden">
              <p className="text-[8px] leading-tight md:text-sm uppercase 2xl:text-base text-balance line-clamp-2 break-words">
                {product.title}
              </p>
              {product.producerName ? (
                <p className="text-[7px] md:text-xs text-muted-foreground font-normal line-clamp-1 mt-0.5 leading-tight">
                  {product.producerName}
                </p>
              ) : null}
            </div>
            <div className="flex gap-1 md:gap-2 items-center justify-end min-w-0 shrink md:max-w-[35%] text-[9px] md:text-sm uppercase 2xl:text-base text-right overflow-hidden">
              <span>
                {formatPrice(price.amount, price.currencyCode, intlLocale)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Server-rendered PLP grid — images in initial HTML for fast LCP. */
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
