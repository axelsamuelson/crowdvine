import { headers } from "next/headers";
import Link from "next/link";

import { ProductListStaticGrid } from "@/app/vin/components/product-list-static-grid";
import { isB2BHost } from "@/lib/b2b-site";
import { fetchProductsData } from "@/lib/crowdvine/products-data";
import { ARTICLE_GUIDE_H2_CLASS } from "@/lib/guides/article-guide-shell";
import type { AppLocale } from "@/lib/i18n/locale";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import { wineCategoryCatalogFilters } from "@/lib/wine-categories";

const LINK_CLASS = "underline underline-offset-4 hover:text-foreground";

export type GuideTaggedWineBlockLink = {
  href: string;
  label: string;
};

/**
 * Live wines for a shop tag, in the same order as the category page
 * (`fetchProductsData` + `wineCategoryCatalogFilters`). Hidden when none match.
 */
export async function GuideTaggedWineBlock({
  tag,
  heading,
  intro,
  link,
  locale,
  limit = 6,
}: {
  tag: string;
  heading: string;
  intro: string;
  link: GuideTaggedWineBlockLink;
  locale: AppLocale;
  limit?: number;
}) {
  const headerList = await headers();
  const isB2BSite = isB2BHost(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
  );
  let rawProducts;
  try {
    rawProducts = await fetchProductsData({
      ...wineCategoryCatalogFilters({ tags: [tag] }),
      isB2BSite,
      locale,
    });
  } catch (error) {
    // CI builds against a placeholder Supabase host. A failed catalog read
    // hides the block instead of failing the page prerender.
    console.error("[GuideTaggedWineBlock]", error);
    return null;
  }
  const products = mapProductDataToShopProducts(rawProducts).slice(0, limit);
  if (products.length === 0) return null;

  return (
    <section data-guide-tagged-wines={tag}>
      <h2 className={ARTICLE_GUIDE_H2_CLASS}>{heading}</h2>
      <p className="text-[17px] leading-[1.75] text-foreground/80">{intro}</p>
      <div className="mt-6">
        <ProductListStaticGrid products={products} locale={locale} />
      </div>
      <p className="mt-6">
        <Link href={link.href} className={LINK_CLASS}>
          {link.label}
        </Link>
      </p>
    </section>
  );
}
