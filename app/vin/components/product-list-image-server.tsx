import Image from "next/image";

import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import {
  featuredImageForProduct,
  PLP_IMAGE_QUALITY,
} from "@/lib/shop/plp-image";
import type { Product } from "@/lib/shopify/types";

export function ProductListImageServer({
  product,
  priority = false,
  index = 0,
}: {
  product: Product;
  priority?: boolean;
  index?: number;
}) {
  const imageToShow = featuredImageForProduct(product);
  const imageUrl = imageToShow?.url || DEFAULT_WINE_IMAGE_PATH;
  const isAboveFold = priority || index < 4;

  return (
    <div className="block size-full overflow-clip [&_img]:block">
      <Image
        src={imageUrl}
        alt={imageToShow?.altText || product.title}
        width={imageToShow?.width || 600}
        height={imageToShow?.height || 600}
        sizes="(max-width: 768px) 50vw, 33vw"
        className="object-cover size-full block"
        quality={PLP_IMAGE_QUALITY}
        priority={isAboveFold}
        loading={isAboveFold ? "eager" : "lazy"}
        fetchPriority={index < 2 ? "high" : isAboveFold ? "auto" : "low"}
        placeholder={imageToShow?.thumbhash ? "blur" : undefined}
        blurDataURL={imageToShow?.thumbhash}
      />
    </div>
  );
}
