import { ProductPdpLayout } from "@/components/product/product-pdp-layout";
import { PdpTestFixtureTabs } from "@/components/product/pdp-test-preview";
import type { Product } from "@/lib/shopify/types";

type TestProduct = Product & { productType?: string };

interface PdpTestLayoutProps {
  product: TestProduct;
  fixtureId: string;
}

/** Dev preview wrapper around the production PDP layout. */
export function PdpTestLayout({ product, fixtureId }: PdpTestLayoutProps) {
  return (
    <ProductPdpLayout
      product={product}
      addToCartPreviewDisabled
      devPreview={
        <div className="border-b border-border bg-background/80 px-sides py-2 md:py-3">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dev preview — enrichment PDP
            </p>
            <PdpTestFixtureTabs active={fixtureId} />
          </div>
        </div>
      }
    />
  );
}
