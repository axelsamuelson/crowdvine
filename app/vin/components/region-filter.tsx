"use client";

import { Check } from "lucide-react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { useMemo } from "react";

import { useProducts } from "@/components/shop/products-provider";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";
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

type RegionFilterMode = "chips" | "sidebar" | "drawer" | "overlay";

interface RegionFilterProps {
  className?: string;
  mode?: RegionFilterMode;
  onSeeAll?: () => void;
  /** When set, limits chip/list options (e.g. SSR-provided linkable regions). */
  regions?: readonly WineRegion[];
}

function sortRegionSlugs(slugs: string[]): WineRegionSlug[] {
  const serialized = serializeWineRegionParam(slugs);
  return serialized ? (serialized.split(",") as WineRegionSlug[]) : [];
}

export function RegionFilter({
  className,
  mode = "chips",
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

  const clearRegions = () => {
    void setActive(null);
  };

  const labelFor = (region: WineRegion) =>
    locale === "en" ? region.labelEn : region.labelSv;

  if (mode === "chips") {
    return (
      <div
        className={cn(
          "hidden flex-wrap items-center gap-2 md:flex",
          className,
        )}
        role="group"
        aria-label={t("shop.region")}
      >
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-[#0A0A0A]">
          {t("shop.region")}
        </span>
        {options.map((region) => {
          const isOn = active.includes(region.slug);
          return (
            <button
              key={region.slug}
              type="button"
              onClick={() => toggleRegion(region.slug)}
              aria-pressed={isOn}
              aria-label={t("shop.filterByRegion", {
                name: labelFor(region),
              })}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                isOn
                  ? "border-[#0A0A0A] bg-[#0A0A0A] font-medium text-white"
                  : "border-zinc-300 bg-white text-[#0A0A0A] hover:border-[#0A0A0A]",
              )}
            >
              {isOn ? (
                <Check
                  aria-hidden
                  className="size-3.5 shrink-0"
                  strokeWidth={2.5}
                />
              ) : null}
              {labelFor(region)}
            </button>
          );
        })}
        {selectedCount > 0 ? (
          <button
            type="button"
            onClick={clearRegions}
            className="ml-1 cursor-pointer text-[13px] text-[#0A0A0A] underline underline-offset-2"
          >
            {t("shop.clear")}
          </button>
        ) : null}
      </div>
    );
  }

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
