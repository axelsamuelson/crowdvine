import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ProductListStaticGrid } from "@/app/vin/components/product-list-static-grid";
import {
  Breadcrumb,
  BreadcrumbItem,
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
import { categoryPageTitle } from "@/lib/seo/category-page-title";
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
  WINE_REGION_INDEX_MIN_LIVE,
  WINE_REGION_SLUGS,
  isWineRegionSlug,
  wineRegionBySlug,
  wineRegionPagePath,
  wineRegionPageUrls,
  type WineRegionSlug,
} from "@/lib/wine-regions";

type RegionProducerSummary = {
  id: string;
  name: string;
  href: string;
  wineCount: number;
  subregion: string | null;
};

function grapesFromProducts(products: Product[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const product of products) {
    const grapeOption = product.options?.find(
      (opt) => opt.name === "Grape Varieties",
    );
    for (const value of grapeOption?.values ?? []) {
      const name = typeof value === "string" ? value : value.name;
      const trimmed = name?.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, "sv"));
}

function stylesFromProducts(products: Product[], locale: AppLocale): string[] {
  const labels = new Map<string, string>();
  for (const product of products) {
    const colorOption = product.options?.find((opt) => opt.name === "Color");
    const raw =
      typeof colorOption?.values?.[0] === "string"
        ? colorOption.values[0]
        : colorOption?.values?.[0]?.name;
    const key = (raw ?? "").trim().toLowerCase();
    if (!key || labels.has(key)) continue;
    labels.set(key, localizeColorLabel(raw!.trim(), locale));
  }
  return [...labels.values()].sort((a, b) => a.localeCompare(b, "sv"));
}

function localizeColorLabel(raw: string, locale: AppLocale): string {
  const key = raw.toLowerCase();
  if (locale === "sv") {
    if (key.includes("red") || key === "rött" || key === "rott") return "Rött";
    if (key.includes("white") || key === "vitt" || key === "vit") return "Vitt";
    if (key.includes("rosé") || key.includes("rose")) return "Rosé";
    if (key.includes("orange")) return "Orange";
    if (key.includes("sparkling") || key.includes("mousserande")) {
      return "Mousserande";
    }
  } else {
    if (key.includes("röd") || key.includes("rott") || key === "red") {
      return "Red";
    }
    if (key.includes("vit") || key === "white") return "White";
    if (key.includes("rosé") || key.includes("rose")) return "Rosé";
    if (key.includes("orange")) return "Orange";
    if (key.includes("mousserande") || key.includes("sparkling")) {
      return "Sparkling";
    }
  }
  return raw;
}

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
      shopAll: (label: string) => `Se alla viner från ${label}`,
      characteristicsFallback: "Om regionen",
      location: "Läge",
      grapes: "Druvor",
      styles: "Stilar",
      producerCount: "Producenter hos PACT",
      producersHeading: (label: string) => `Producenter i ${label}`,
      winesHeading: (label: string) => `Viner från ${label}`,
      wineCount: (n: number) => (n === 1 ? "1 vin" : `${n} viner`),
      producerWines: (n: number) => (n === 1 ? "1 vin" : `${n} viner`),
      copyPlaceholder: "Regiontext kommer snart.",
      metaFallback: (label: string) =>
        `Naturvin från ${label} — reservera flaskor via PACT.`,
    };
  }
  return {
    regionsCrumb: "Regions",
    shopAll: (label: string) => `See all wines from ${label}`,
    characteristicsFallback: "About the region",
    location: "Location",
    grapes: "Grapes",
    styles: "Styles",
    producerCount: "Producers at PACT",
    producersHeading: (label: string) => `Producers in ${label}`,
    winesHeading: (label: string) => `Wines from ${label}`,
    wineCount: (n: number) => (n === 1 ? "1 wine" : `${n} wines`),
    producerWines: (n: number) => (n === 1 ? "1 wine" : `${n} wines`),
    copyPlaceholder: "Region copy coming soon.",
    metaFallback: (label: string) =>
      `Natural wine from ${label} — reserve bottles with PACT.`,
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
  const content = getWineRegionContent(slug, locale);
  const label = locale === "en" ? region.labelEn : region.labelSv;
  const ui = regionUiCopy(locale);
  const titleBase =
    content.metaTitle?.trim() ||
    content.h1?.trim() ||
    label;
  const pageTitle = categoryPageTitle(titleBase, config.siteName);
  const description =
    content.metaDescription?.trim() || ui.metaFallback(label);
  const urls = wineRegionPageUrls(slug);
  const canonical = `${PACT_PUBLIC_ORIGIN}${wineRegionPagePath(slug, locale)}`;
  const indexable = products.length >= WINE_REGION_INDEX_MIN_LIVE;

  return {
    title: pageTitle,
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
  const h1 = content.h1?.trim() || label;
  const pagePath = wineRegionPagePath(slug, locale);
  const pageUrl = `${PACT_PUBLIC_ORIGIN}${pagePath}`;
  const shopHref = `${shopPathForLocale(locale)}?region=${slug}`;
  const homeUrl =
    locale === "sv" ? PACT_PUBLIC_ORIGIN : `${PACT_PUBLIC_ORIGIN}/en`;
  const productPrefix = locale === "sv" ? "/produkt" : "/product";
  const producers = producersFromProducts(products, locale);
  const grapes = grapesFromProducts(products);
  const styles = stylesFromProducts(products, locale);

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
        item: pageUrl,
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
                <BreadcrumbPage className="text-muted-foreground">
                  {ui.regionsCrumb}
                </BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <section className="px-5 pb-9 pt-5 md:px-10">
          <h1 className="max-w-[16ch] text-[clamp(2.125rem,5.5vw,4rem)] font-medium leading-[1.05] tracking-[-0.02em]">
            {h1}
          </h1>
          {content.intro?.trim() ? (
            <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-zinc-700">
              {content.intro.trim()}
            </p>
          ) : null}
          <Link
            href={shopHref}
            className="mt-[22px] inline-flex items-center rounded-md bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            {ui.shopAll(label)}
          </Link>
        </section>

        <section className="grid gap-8 px-5 pb-12 md:px-10 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div>
            <h2 className="text-[clamp(1.5rem,2.4vw,1.75rem)] font-medium tracking-[-0.02em]">
              {content.characteristicsHeading?.trim() ||
                ui.characteristicsFallback}
            </h2>
            {content.characteristicsBody?.trim() ? (
              <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-foreground/80">
                {content.characteristicsBody.trim()}
              </p>
            ) : (
              <p
                className="mt-3 max-w-[62ch] rounded-md border border-dashed border-zinc-300 px-3 py-4 text-sm text-muted-foreground"
                data-region-copy-slot="characteristics"
              >
                {ui.copyPlaceholder}
              </p>
            )}
          </div>
          <dl className="self-start">
            <div className="border-t border-zinc-200 py-3.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ui.location}
              </dt>
              <dd className="mt-1 text-[15px] text-foreground">
                {content.locationBlurb?.trim() || (
                  <span
                    className="text-muted-foreground"
                    data-region-copy-slot="location"
                  >
                    {ui.copyPlaceholder}
                  </span>
                )}
              </dd>
            </div>
            {grapes.length > 0 ? (
              <div className="border-t border-zinc-200 py-3.5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {ui.grapes}
                </dt>
                <dd className="mt-1 text-[15px] text-foreground">
                  {grapes.join(", ")}
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
            <div className="border-t border-zinc-200 py-3.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ui.producerCount}
              </dt>
              <dd className="mt-1 text-[15px] text-foreground">
                {producers.length}
              </dd>
            </div>
          </dl>
        </section>

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

        <section className="px-5 pb-4 md:px-10">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-[clamp(1.375rem,2.2vw,1.625rem)] font-medium tracking-[-0.02em]">
              {ui.winesHeading(label)}
            </h2>
            <span className="text-[13px] text-muted-foreground">
              {ui.wineCount(products.length)}
            </span>
          </div>
        </section>
        <div className="pb-10">
          <ProductListStaticGrid products={products} locale={locale} />
        </div>
      </div>
      <Footer />
    </>
  );
}
