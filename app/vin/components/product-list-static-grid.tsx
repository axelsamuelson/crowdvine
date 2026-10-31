import Link from "next/link";

import { DirectBoxDeliveryPromise } from "@/components/commerce/direct-box-delivery-promise";
import { MinSixBottlesHint } from "@/components/commerce/min-six-bottles-hint";
import { ServerListPrice } from "@/components/commerce/server-list-price";
import { SsrReserveLink } from "@/components/commerce/ssr-reserve-link";
import { ProductListImageServer } from "@/app/vin/components/product-list-image-server";
import { ProductGrid } from "@/app/vin/components/product-grid";
import type { AppLocale } from "@/lib/i18n/locale";
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

  return (
    <div className="relative w-full overflow-visible">
      <div
        className="relative z-10 w-full aspect-[3/4] md:aspect-square bg-muted group"
        style={{ clipPath: "inset(0)" }}
      >
        <div className="relative size-full overflow-clip">
          <Link
            href={href}
            className="block size-full focus-visible:outline-none"
            prefetch={false}
          >
            <ProductListImageServer
              product={product}
              priority={index < 3}
              index={index}
            />
          </Link>
        </div>

        <div className="absolute inset-0 flex flex-col justify-between p-2 md:p-3 pointer-events-none">
          <div className="flex gap-2 md:gap-4 justify-between items-start w-full font-semibold">
            <div className="flex flex-col min-w-0 max-w-[55%] overflow-hidden">
              <p className="text-[8px] leading-tight md:text-sm uppercase 2xl:text-base text-balance line-clamp-2 break-words">
                {product.title}
              </p>
              {product.producerName ? (
                <p className="text-[7px] md:text-xs text-muted-foreground font-normal line-clamp-1 mt-0.5 leading-tight">
                  {product.producerName}
                </p>
              ) : null}
            </div>
            <ServerListPrice
              product={product}
              locale={locale}
              className="text-[9px] md:text-sm uppercase 2xl:text-base text-right font-semibold"
            />
          </div>

          <div className="pointer-events-auto space-y-1.5 rounded-md bg-white/95 p-2 shadow-sm backdrop-blur-sm">
            <MinSixBottlesHint locale={locale} compact />
            <DirectBoxDeliveryPromise locale={locale} compact />
            <SsrReserveLink handle={product.handle} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Server-rendered PLP grid — images, price, Reservera CTA, direct-box promise. */
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
