"use client";

import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useMemo } from "react";

import { useProducts } from "@/components/shop/products-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
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
} from "./shop-filter-option";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";

type RegionFilterMode = "sidebar" | "drawer" | "overlay";

interface RegionFilterProps {
  className?: string;
  mode?: RegionFilterMode;
  onSeeAll?: () => void;
  /** When set, limits list options (e.g. SSR-provided linkable regions). */
  regions?: readonly WineRegion[];
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
}: RegionFilterProps) {
  const { t, context } = useTranslations();
  const locale = context.locale === "en" ? "en" : "sv";
  const { originalProducts } = useProducts();
  const [active, setActive] = useQueryState(
    "region",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const linkable = useMemo(() => {
    if (regionsProp) return [...regionsProp];
    return getLinkableWineRegionsFromProducts(originalProducts);
  }, [originalProducts, regionsProp]);

  // Keep selected regions visible so the user can clear them even if stock hit 0.
  const options = useMemo(() => {
    const bySlug = new Map(linkable.map((r) => [r.slug, r]));
    for (const slug of active) {
      if (bySlug.has(slug)) continue;
      const region = wineRegionBySlug(slug);
      if (region) bySlug.set(slug, region);
    }
    return [...bySlug.values()].sort((a, b) =>
      a.slug.localeCompare(b.slug),
    );
  }, [active, linkable]);

  if (options.length === 0) return null;

  const selectedCount = active.filter((slug) =>
    options.some((r) => r.slug === slug),
  ).length;

  const toggleRegion = (slug: WineRegionSlug) => {
    const next = active.includes(slug)
      ? active.filter((s) => s !== slug)
      : [...active, slug];
    const sorted = sortRegionSlugs(next);
    void setActive(sorted.length ? sorted : null);
  };

  const labelFor = (region: WineRegion) =>
    locale === "en" ? region.labelEn : region.labelSv;

  const collapsible = mode !== "overlay";
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
      collapsible={collapsible}
      headerAction={seeAllButton}
      className={className}
    >
      <div className="flex flex-col gap-0.5">
        {options.map((region) => {
          const isOn = active.includes(region.slug);
          return (
            <button
              key={region.slug}
              type="button"
              onClick={() => toggleRegion(region.slug)}
              className={shopFilterOptionClassName(isOn)}
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
    </ShopFilterCollapsible>
  );
}
