"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useMemo } from "react";

import { useProducts } from "@/components/shop/products-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  localeFromShopPathname,
  resolveRegionFilterNavigationUrl,
  selectedWineRegionSlugs,
  shouldNavigateShopFilters,
} from "@/lib/shop/filter-navigation";
import {
  getLinkableWineRegionsFromProducts,
  serializeWineRegionParam,
  wineRegionBySlug,
  type WineRegion,
  type WineRegionSlug,
} from "@/lib/wine-regions";
import {
  ShopFilterOptionContent,
  shopFilterOptionClassName,
  shopFilterSheetListClassName,
} from "./shop-filter-option";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";

type RegionFilterMode = "sidebar" | "drawer" | "overlay";

interface RegionFilterProps {
  className?: string;
  mode?: RegionFilterMode;
  onSeeAll?: () => void;
  /** When set, limits list options (e.g. SSR-provided linkable regions). */
  regions?: readonly WineRegion[];
  /** Slugs with at least one live wine, so a region PLP still lists the others. */
  linkableRegionSlugs?: readonly string[];
}

function sortRegionSlugs(slugs: string[]): WineRegionSlug[] {
  const serialized = serializeWineRegionParam(slugs);
  return serialized ? (serialized.split(",") as WineRegionSlug[]) : [];
}

export function RegionFilter({
  className,
  mode = "sidebar",
  onSeeAll,
  regions: regionsProp,
  linkableRegionSlugs,
}: RegionFilterProps) {
  const { t, context } = useTranslations();
  const locale = context.locale === "en" ? "en" : "sv";
  const { originalProducts } = useProducts();
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [active, setActive] = useQueryState(
    "region",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const selectedSlugs = selectedWineRegionSlugs(pathname, active);

  const linkable = useMemo(() => {
    if (linkableRegionSlugs?.length) {
      return linkableRegionSlugs
        .map((slug) => wineRegionBySlug(slug))
        .filter((region): region is WineRegion => Boolean(region));
    }
    if (regionsProp) return [...regionsProp];
    return getLinkableWineRegionsFromProducts(originalProducts);
  }, [linkableRegionSlugs, originalProducts, regionsProp]);

  // Keep selected regions visible so the user can clear them even if stock hit 0.
  const options = useMemo(() => {
    const bySlug = new Map(linkable.map((r) => [r.slug, r]));
    for (const slug of selectedSlugs) {
      if (bySlug.has(slug)) continue;
      const region = wineRegionBySlug(slug);
      if (region) bySlug.set(slug, region);
    }
    return [...bySlug.values()].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );
  }, [linkable, selectedSlugs]);

  if (options.length === 0) return null;

  const selectedRegions = options.filter((r) => selectedSlugs.includes(r.slug));
  const selectedCount = selectedRegions.length;

  const toggleRegion = (slug: WineRegionSlug) => {
    const next = selectedSlugs.includes(slug)
      ? selectedSlugs.filter((s) => s !== slug)
      : [...selectedSlugs, slug];
    const sorted = sortRegionSlugs(next);
    const shopLocale = localeFromShopPathname(pathname);
    if (shouldNavigateShopFilters(pathname)) {
      router.push(
        resolveRegionFilterNavigationUrl({
          locale: shopLocale,
          currentPath: pathname,
          search: searchParams.toString(),
          nextSlugs: sorted,
        }),
      );
      return;
    }
    void setActive(sorted.length ? sorted : null);
  };

  const labelFor = (region: WineRegion) =>
    locale === "en" ? region.labelEn : region.labelSv;

  const collapsible = mode !== "overlay";
  const isSheet = mode === "drawer";
  const selectionSummary = isSheet
    ? selectedRegions.map(labelFor).join(", ") || undefined
    : undefined;
  const seeAllButton =
    mode === "sidebar" && onSeeAll ? (
      <button
        type="button"
        onClick={onSeeAll}
        className="text-xs font-medium text-foreground/60 transition-colors hover:text-foreground/80"
        aria-label={t("shop.seeAllFilters")}
      >
        {t("shop.seeAll")}
      </button>
    ) : null;

  return (
    <ShopFilterCollapsible
      title={t("shop.region")}
      count={selectedCount}
      selectionSummary={selectionSummary}
      density={isSheet ? "sheet" : "default"}
      collapsible={collapsible}
      headerAction={seeAllButton}
      className={className}
    >
      <div className={isSheet ? shopFilterSheetListClassName() : undefined}>
        <div className="flex flex-col gap-0.5">
          {options.map((region) => {
            const isOn = selectedSlugs.includes(region.slug);
            return (
              <button
                key={region.slug}
                type="button"
                onClick={() => toggleRegion(region.slug)}
                className={shopFilterOptionClassName(isOn, {
                  density: isSheet ? "sheet" : "default",
                })}
                aria-pressed={isOn}
                aria-label={t("shop.filterByRegion", {
                  name: labelFor(region),
                })}
              >
                <ShopFilterOptionContent selected={isOn}>
                  {labelFor(region)}
                </ShopFilterOptionContent>
              </button>
            );
          })}
        </div>
      </div>
    </ShopFilterCollapsible>
  );
}
