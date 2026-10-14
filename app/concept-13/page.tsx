import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { Footer } from "@/components/layout/footer";
import { LatestProductCard } from "@/components/products/latest-product-card";
import { HomeBackdropTitle } from "@/components/home/home-backdrop-title";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { getCollections, getProducts } from "@/lib/shopify";
import { getLabelPosition } from "@/lib/utils";
import { Product } from "@/lib/shopify/types";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { translate } from "@/lib/i18n/messages";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Concept 13",
  robots: { index: false, follow: false },
};

const BACKDROP_IMAGE = "/images/hero_bild_5.webp";

const BACKDROP_TITLE = "vin direkt till oss konsumenter från producenten";
const BACKDROP_SUBTITLE =
  "Ett nytt sätt att köpa bättre vin på, för de som dricker men även för de som producerar.";

export default async function Concept13Page() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin-auth/login");
  }

  const [h, shoppingContext] = await Promise.all([
    headers(),
    getShoppingContextFromRequest({ skipUser: true }).catch(() =>
      fallbackShoppingContext(),
    ),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const productCurrencyParams = {
    displayCurrencyCode: shoppingContext.currencyCode,
    sekToDisplayRate: shoppingContext.sekToDisplayRate,
  };

  const [collections, featuredProductsRaw] = await Promise.all([
    getCollections().catch(() => []),
    getProducts({
      limit: 5,
      sortKey: "CREATED_AT",
      reverse: true,
      host,
      ...productCurrencyParams,
    }).catch(() => [] as Product[]),
  ]);

  let featuredProducts = featuredProductsRaw;
  if (featuredProducts.length === 0) {
    try {
      featuredProducts = (
        await getProducts({ host, ...productCurrencyParams })
      ).slice(0, 8);
    } catch {
      featuredProducts = [];
    }
  }

  const [lastProduct, ...restProducts] = featuredProducts;
  const paths = localizedPathsForLocale(shoppingContext.locale);
  const t = (key: string) => translate(shoppingContext.locale, key);

  return (
    <>
      <main>
        <div className="grid grid-cols-1 md:grid-cols-12 md:gap-sides">
          <HomeSidebar collections={collections} />
          <div className="flex relative flex-col grid-cols-2 col-span-8 w-full md:grid">
            <HomeBackdropTitle
              className="col-span-2"
              src={BACKDROP_IMAGE}
              title={BACKDROP_TITLE}
              subtitle={BACKDROP_SUBTITLE}
              primaryCta={{ href: paths.shop, label: t("nav.shopAll") }}
              secondaryCta={{
                href: paths.shopCollection("wine-boxes"),
                label: t("home.allWineBoxes"),
              }}
              highlights={[
                {
                  label: t("home.glassDirectFromProducer"),
                  tone: "emerald",
                },
                { label: t("home.glassHomeDelivery"), tone: "amber" },
                { label: t("home.glassNoMiddlemen"), tone: "sky" },
              ]}
            />
            {featuredProducts.length > 0 && lastProduct && (
              <>
                <LatestProductCard
                  className="col-span-2"
                  product={lastProduct}
                  principal
                  showLatestDrop
                  priority
                />
                {restProducts.map((product, index) => (
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
