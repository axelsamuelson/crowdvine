import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { PageLayout } from "@/components/layout/page-layout";
import { LatestProductCard } from "@/components/products/latest-product-card";
import { Badge } from "@/components/ui/badge";
import {
  getCollectionProducts,
  getCollections,
  getProducts,
} from "@/lib/shopify";
import { getLabelPosition } from "../lib/utils";
import { Product } from "../lib/shopify/types";

export default function Home() {
  // Static content for now - will be replaced with Pages Functions
  const collections: any[] = [];
  const featuredProducts: Product[] = [];

  return (
    <PageLayout>
      <div className="contents md:grid md:grid-cols-12 md:gap-sides">
        <HomeSidebar collections={collections} />
        <div className="flex relative flex-col grid-cols-2 col-span-8 w-full md:grid">
          <div className="fixed top-0 left-0 z-10 w-full pointer-events-none base-grid py-sides">
            <div className="col-span-8 col-start-5">
              <div className="hidden px-6 lg:block">
                <Badge variant="outline-secondary">latest drop</Badge>
              </div>
            </div>
          </div>
          {featuredProducts.length > 0 && (
            <>
              <LatestProductCard
                className="col-span-2"
                product={featuredProducts[0]}
                principal
              />

              {featuredProducts.slice(1).map((product: any, index: number) => (
                <LatestProductCard
                  className="col-span-1"
                  key={product.id}
                  product={product}
                  labelPosition={getLabelPosition(index)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
