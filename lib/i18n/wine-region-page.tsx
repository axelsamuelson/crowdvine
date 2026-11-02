import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ProductListStaticGrid } from "@/app/vin/components/product-list-static-grid";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Footer } from "@/components/layout/footer";
import { isB2BHost } from "@/lib/b2b-site";
import { generateProducerSlug } from "@/lib/producer-handle";
import type { AppLocale } from "@/lib/i18n/locale";
import {
  PACT_PUBLIC_ORIGIN,
  producerPublicPath,
  shopPathForLocale,
} from "@/lib/i18n/localized-routes";
import { mapProductDataToShopProducts } from "@/lib/map-product-data-to-shop-product";
import { getWineRegionContent } from "@/lib/region-content";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getCachedShopProducts } from "@/lib/shop/cached-shop-products";
import { getProductWineRegionSlug } from "@/lib/shop/filter-products-by-region";
import {
  DEFAULT_B2B_SHOP_SORT,
  DEFAULT_B2C_SHOP_SORT,
} from "@/lib/shopify/constants";
import type { Product } from "@/lib/shopify/types";
import { mapSortKeys } from "@/lib/shopify/utils";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { getCachedShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { getSiteConfig } from "@/lib/site-config-server";
import {
  formatGrapeListLabel,
  grapesFromProducts,
  stylesFromProducts,
} from "@/lib/wine-region-page-facts";
import {
  WINE_REGION_INDEX_MIN_LIVE,
  WINE_REGION_SLUGS,
  isWineRegionSlug,
  wineRegionBySlug,
  wineRegionPageH1,
  wineRegionPageMetaDescription,
  wineRegionPagePath,
  wineRegionPageTitle,
  wineRegionPageUrls,
  type WineRegionSlug,
} from "@/lib/wine-regions";

/** Max wines on the region page grid; remainder via shop filter link. */
export const REGION_PAGE_WINE_GRID_LIMIT = 24;

type RegionProducerSummary = {
  id: string;
  name: string;
  href: string;
  wineCount: number;
  subregion: string | null;
};

function producersFromProducts(
  products: Product[],
  locale: AppLocale,
): RegionProducerSummary[] {
  const byKey = new Map<string, RegionProducerSummary>();
  for (const product of products) {
    const name = product.producerName?.trim();
    if (!name) continue;
    const id = product.producerId ?? generateProducerSlug(name);
    const existing = byKey.get(id);
    if (existing) {
      existing.wineCount += 1;
      continue;
    }
    byKey.set(id, {
      id,
      name,
      href: producerPublicPath(generateProducerSlug(name), locale),
      wineCount: 1,
      subregion: product.producerLocation?.subregion?.trim() || null,
    });
  }
  return [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );
}

async function loadRegionProducts(
  slug: WineRegionSlug,
  locale: AppLocale,
): Promise<Product[]> {
  const headerList = await headers();
  const isB2BSite = isB2BHost(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
  );
  const shoppingContext = await getCachedShoppingContextFromRequest({
    skipUser: false,
  }).catch(() => fallbackShoppingContext());
  const defaultSort = isB2BSite ? DEFAULT_B2B_SHOP_SORT : DEFAULT_B2C_SHOP_SORT;
  const { sortKey, reverse } = mapSortKeys(defaultSort, "product");
  const raw = await getCachedShopProducts({
    sortKey,
    reverse,
    isB2BSite,
    displayCurrencyCode: shoppingContext.currencyCode,
    sekToDisplayRate: shoppingContext.sekToDisplayRate,
    locale,
  });
  return mapProductDataToShopProducts(raw).filter(
    (product) => getProductWineRegionSlug(product) === slug,
  );
}

function regionUiCopy(locale: AppLocale) {
  if (locale === "sv") {
    return {
      regionsCrumb: "Regioner",
      filterInShop: "Filtrera i butiken",
      showAll: (n: number) => `Visa alla ${n}`,
      location: "Läge",
      grapes: "Druvor",
      styles: "Stilar",
      producerCount: "Producenter hos PACT",
      producersHeading: (label: string) => `Producenter i ${label}`,
      winesHeading: (label: string) => `Viner från ${label}`,
      wineCount: (n: number) => (n === 1 ? "1 vin" : `${n} viner`),
      producerWines: (n: number) => (n === 1 ? "1 vin" : `${n} viner`),
      characteristicsFallback: "Om regionen",
    };
  }
  return {
    regionsCrumb: "Regions",
    filterInShop: "Filter in the shop",
    showAll: (n: number) => `Show all ${n}`,
    location: "Location",
    grapes: "Grapes",
    styles: "Styles",
    producerCount: "Producers at PACT",
    producersHeading: (label: string) => `Producers in ${label}`,
    winesHeading: (label: string) => `Wines from ${label}`,
    wineCount: (n: number) => (n === 1 ? "1 wine" : `${n} wines`),
    producerWines: (n: number) => (n === 1 ? "1 wine" : `${n} wines`),
    characteristicsFallback: "About the region",
  };
}

export function wineRegionStaticParams(): Array<{ slug: string }> {
  return WINE_REGION_SLUGS.map((slug) => ({ slug }));
}

export async function buildWineRegionPageMetadata(
  slugParam: string,
  locale: AppLocale,
): Promise<Metadata> {
  if (!isWineRegionSlug(slugParam)) notFound();
  const slug = slugParam;
  const region = wineRegionBySlug(slug)!;
  const products = await loadRegionProducts(slug, locale);
  if (products.length === 0) notFound();

  const config = await getSiteConfig();
  const pageTitle = wineRegionPageTitle(region, locale);
  const description = wineRegionPageMetaDescription(region, locale);
  const urls = wineRegionPageUrls(slug);
  const canonical = `${PACT_PUBLIC_ORIGIN}${wineRegionPagePath(slug, locale)}`;
  const indexable = products.length >= WINE_REGION_INDEX_MIN_LIVE;

  return {
    title: { absolute: pageTitle },
    description,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: {
      canonical,
      languages: {
        sv: urls.sv,
        en: urls.en,
        "x-default": urls.xDefault,
      },
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonical,
      type: "website",
      images: defaultOpenGraphImages({ siteName: config.siteName }),
    },
    twitter: pageTwitterCard(pageTitle, description),
  };
}

export async function renderWineRegionPage(options: {
  slugParam: string;
  locale: AppLocale;
}) {
  const { slugParam, locale } = options;
  if (!isWineRegionSlug(slugParam)) notFound();
  const slug = slugParam;
  const region = wineRegionBySlug(slug)!;
  const products = await loadRegionProducts(slug, locale);
  if (products.length === 0) notFound();

  const content = getWineRegionContent(slug, locale);
  const label = locale === "en" ? region.labelEn : region.labelSv;
  const ui = regionUiCopy(locale);
  const h1 = wineRegionPageH1(region, locale);
  const intro = content.intro?.trim() || "";
  const pagePath = wineRegionPagePath(slug, locale);
  const pageUrl = `${PACT_PUBLIC_ORIGIN}${pagePath}`;
  const shopPath = shopPathForLocale(locale);
  const shopHref = `${shopPath}?region=${slug}`;
  const shopAbsolute = `${PACT_PUBLIC_ORIGIN}${shopPath}`;
  const homeUrl =
    locale === "sv" ? PACT_PUBLIC_ORIGIN : `${PACT_PUBLIC_ORIGIN}/en`;
  const productPrefix = locale === "sv" ? "/produkt" : "/product";
  const producers = producersFromProducts(products, locale);
  const grapeList = grapesFromProducts(products);
  const grapeLabel = formatGrapeListLabel(grapeList, locale);
  const styles = stylesFromProducts(products, locale);

  if (grapeList.typoSuspects.length > 0) {
    console.info(
      "[wine-region] grape typo suspects",
      slug,
      grapeList.typoSuspects,
    );
  }

  const gridProducts =
    products.length > REGION_PAGE_WINE_GRID_LIMIT
      ? products.slice(0, REGION_PAGE_WINE_GRID_LIMIT)
      : products;
  const gridTruncated = gridProducts.length < products.length;
  const shopLinkLabel = gridTruncated
    ? ui.showAll(products.length)
    : ui.filterInShop;

  const characteristicsHeading = content.characteristicsHeading?.trim() || "";
  const characteristicsBody = content.characteristicsBody?.trim() || "";
  const locationBlurb = content.locationBlurb?.trim() || "";
  const showCharacteristics = Boolean(
    characteristicsHeading || characteristicsBody,
  );
  const showLocation = Boolean(locationBlurb);
  const showFacts =
    showLocation ||
    grapeLabel.length > 0 ||
    styles.length > 0 ||
    producers.length > 0;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "sv" ? "Hem" : "Home",
        item: homeUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: ui.regionsCrumb,
        item: shopAbsolute,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: label,
        item: pageUrl,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: h1,
    url: pageUrl,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.title,
      url: `${PACT_PUBLIC_ORIGIN}${productPrefix}/${product.handle}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd),
        }}
      />

      <div className="min-h-screen pt-top-spacing font-sans">
        <div className="px-5 pt-5 text-xs text-muted-foreground md:px-10">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={shopPath}>{ui.regionsCrumb}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <section className="px-5 pb-6 pt-5 md:px-10">
          <h1 className="max-w-[20ch] text-[clamp(2.125rem,5.5vw,4rem)] font-medium leading-[1.05] tracking-[-0.02em]">
            {h1}
          </h1>
          {intro ? (
            <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-zinc-700">
              {intro}
            </p>
          ) : null}
        </section>

        <section className="px-5 pb-4 md:px-10">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-[clamp(1.375rem,2.2vw,1.625rem)] font-medium tracking-[-0.02em]">
              {ui.winesHeading(label)}
            </h2>
            <div className="flex items-baseline gap-3 text-[13px] text-muted-foreground">
              <span>{ui.wineCount(products.length)}</span>
              <Link
                href={shopHref}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {shopLinkLabel}
              </Link>
            </div>
          </div>
        </section>
        <div className="pb-12">
          {/* Static PLP grid (ServerListPrice) — no ProductsProvider on region routes */}
          <ProductListStaticGrid products={gridProducts} locale={locale} />
        </div>

        {showCharacteristics || showFacts ? (
          <section
            className={`grid gap-8 px-5 pb-12 md:px-10 ${
              showCharacteristics
                ? "lg:grid-cols-[1.3fr_1fr] lg:gap-20"
                : ""
            }`}
          >
            {showCharacteristics ? (
              <div>
                <h2 className="text-[clamp(1.5rem,2.4vw,1.75rem)] font-medium tracking-[-0.02em]">
                  {characteristicsHeading || ui.characteristicsFallback}
                </h2>
                {characteristicsBody ? (
                  <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-foreground/80">
                    {characteristicsBody}
                  </p>
                ) : null}
              </div>
            ) : null}
            {showFacts ? (
              <dl className="self-start">
                {showLocation ? (
                  <div className="border-t border-zinc-200 py-3.5">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {ui.location}
                    </dt>
                    <dd className="mt-1 text-[15px] text-foreground">
                      {locationBlurb}
                    </dd>
                  </div>
                ) : null}
                {grapeLabel ? (
                  <div className="border-t border-zinc-200 py-3.5">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {ui.grapes}
                    </dt>
                    <dd className="mt-1 text-[15px] text-foreground">
                      {grapeLabel}
                    </dd>
                  </div>
                ) : null}
                {styles.length > 0 ? (
                  <div className="border-t border-zinc-200 py-3.5">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {ui.styles}
                    </dt>
                    <dd className="mt-1 text-[15px] text-foreground">
                      {styles.join(", ")}
                    </dd>
                  </div>
                ) : null}
                {producers.length > 0 ? (
                  <div className="border-t border-zinc-200 py-3.5">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {ui.producerCount}
                    </dt>
                    <dd className="mt-1 text-[15px] text-foreground">
                      {producers.length}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </section>
        ) : null}

        {producers.length > 0 ? (
          <section className="px-5 pb-12 md:px-10">
            <h2 className="mb-1.5 text-[clamp(1.375rem,2.2vw,1.625rem)] font-medium tracking-[-0.02em]">
              {ui.producersHeading(label)}
            </h2>
            <ul>
              {producers.map((producer) => (
                <li
                  key={producer.id}
                  className="border-t border-zinc-200 py-3.5"
                >
                  <Link
                    href={producer.href}
                    className="group flex items-center gap-3.5"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-400 text-[11px] text-muted-foreground">
                      {producer.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold group-hover:underline group-hover:underline-offset-4">
                        {producer.name}
                      </div>
                      <div className="text-[13px] text-muted-foreground">
                        {[producer.subregion, label]
                          .filter(Boolean)
                          .join(", ")}
                        {" · "}
                        {ui.producerWines(producer.wineCount)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <Footer />
    </>
  );
}
