import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { Footer } from "@/components/layout/footer";
import { LatestProductCard } from "@/components/products/latest-product-card";
import { Badge } from "@/components/ui/badge";
import {
  getCollectionProducts,
  getCollections,
  getProducts,
} from "@/lib/shopify";
import { getLabelPosition } from "@/lib/utils";
import { Product } from "@/lib/shopify/types";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { MapClientWrapper } from "@/components/home-concepts/map-client-wrapper";

export default async function Concept3Page() {
  // Check if user is admin
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      redirect("/admin-auth/login");
    }
  } catch (error) {
    console.error("Error checking admin auth:", error);
    redirect("/admin-auth/login");
  }

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
      });
    } else {
      const allProducts = await getProducts({});
      featuredProducts = allProducts.slice(0, 8);
    }
  } catch (error) {
    console.error("Error fetching featured products:", error);
    // Fallback to all products if collection products fail
    try {
      const allProducts = await getProducts({});
      featuredProducts = allProducts.slice(0, 8);
    } catch (fallbackError) {
      console.error("Error fetching fallback products:", fallbackError);
      featuredProducts = [];
    }
  }

  const [lastProduct, ...restProducts] = featuredProducts;

  return (
    <>
      {/* Admin Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/home-concepts"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Tillbaka till alla koncept
            </Link>
            <Badge variant="default">Concept 3: In Development</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Map of Makers
          </div>
        </div>
      </div>

      <main className="pt-16">
        <div className="contents md:grid md:grid-cols-12 md:gap-sides">
          <HomeSidebar collections={collections} />
          <div className="flex relative flex-col grid-cols-2 col-span-8 w-full md:grid">
            {/* Map Visualization - Takes first large slot */}
            <div className="col-span-2 min-h-[600px] mb-8">
              <MapClientWrapper />
            </div>


            {/* Products Grid - Same as original */}
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

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

