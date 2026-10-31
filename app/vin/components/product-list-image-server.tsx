import Image from "next/image";

import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import {
  featuredImageForProduct,
  PLP_IMAGE_QUALITY,
} from "@/lib/shop/plp-image";
import { plpCardImageFit } from "@/lib/shop/plp-card-image";
import type { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

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
  const { objectFit, edgeColor } = plpCardImageFit(product.handle);

  return (
    <div
      className="block size-full overflow-clip [&_img]:block"
      style={edgeColor ? { backgroundColor: edgeColor } : undefined}
    >
      <Image
        src={imageUrl}
        alt={imageToShow?.altText || product.title}
        width={imageToShow?.width || 600}
        height={imageToShow?.height || 600}
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
        className={cn(
          "size-full block object-center",
          objectFit === "contain" ? "object-contain" : "object-cover",
        )}
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
