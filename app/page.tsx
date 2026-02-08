import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { Footer } from "@/components/layout/footer";
import { LatestProductCard } from "@/components/products/latest-product-card";
import { Badge } from "@/components/ui/badge";
import {
  getCollectionProducts,
  getCollections,
  getProducts,
} from "@/lib/shopify";
import { getLabelPosition } from "../lib/utils";
import { Product } from "../lib/shopify/types";
import { headers } from "next/headers";

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

export default async function Home() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");

  let collections = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn("Failed to fetch collections in home page:", error);
    collections = [];
  }

  let featuredProducts: Product[] = [];

  try {
    if (collections.length > 0) {
      // Get the 5 most recent products from all producers
      featuredProducts = await getProducts({
        limit: 5,
        sortKey: "CREATED_AT",
        reverse: true,
        host,
      });
    } else {
      const allProducts = await getProducts({ host });
      featuredProducts = allProducts.slice(0, 8);
    }
  } catch (error) {
    console.error("Error fetching featured products:", error);
    // Fallback to all products if collection products fail
    try {
      const allProducts = await getProducts({ host });
      featuredProducts = allProducts.slice(0, 8);
    } catch (fallbackError) {
      console.error("Error fetching fallback products:", fallbackError);
      featuredProducts = [];
    }
  }

  const [lastProduct, ...restProducts] = featuredProducts;

  return (
    <>
      <main>
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
                  product={lastProduct}
                  principal
                />

                {restProducts.map((product: any, index: number) => (
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
      </main>
      <Footer />
    </>
  );
}
