import type { Product } from "@/lib/shopify/types";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import {
  buildNextImagePreloadHref,
  featuredImageForProduct,
} from "@/lib/shop/plp-image";

/** Preload above-the-fold PLP images so LCP discovery is not blocked by client JS. */
export function ProductListLcpPreload({ products }: { products: Product[] }) {
  const top = products.slice(0, 2);

  return (
    <>
      {top.map((product, index) => {
        const image = featuredImageForProduct(product);
        const src = image?.url || DEFAULT_WINE_IMAGE_PATH;
        const href = buildNextImagePreloadHref(src, 640);
        // Skip optimizer preload for the static default bottle.
        if (href === DEFAULT_WINE_IMAGE_PATH) {
          return (
            <link
              key={product.id}
              rel="preload"
              as="image"
              href={DEFAULT_WINE_IMAGE_PATH}
              // @ts-expect-error fetchPriority is valid on link in modern browsers
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          );
        }

        return (
          <link
            key={product.id}
            rel="preload"
            as="image"
            href={href}
            // @ts-expect-error fetchPriority is valid on link in modern browsers
            fetchPriority={index === 0 ? "high" : "auto"}
          />
        );
      })}
    </>
  );
}
