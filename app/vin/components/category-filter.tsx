"use client";

import { Collection } from "@/lib/shopify/types";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCategoryFilterCount } from "../hooks/use-filter-count";
import { useQueryState, parseAsString } from "nuqs";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";

interface CategoryFilterProps {
  collections: Collection[];
  className?: string;
  mode?: "sidebar" | "drawer" | "overlay";
  onSeeAll?: () => void;
}

export function CategoryFilter({
  collections,
  className,
  mode = "sidebar",
  onSeeAll,
}: CategoryFilterProps) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const params = useParams<{ collection: string }>();
  const [producersParam] = useQueryState(
    "producers",
    parseAsString.withDefault(""),
  );
  const hasSelectedCategory = !!params.collection;
  const categoryCount = useCategoryFilterCount();
  const collapsible = mode !== "overlay";

  const selectedProducers = producersParam
    ? producersParam.split(",").filter(Boolean)
    : [];

  const listContainerClass =
    mode === "sidebar" || mode === "drawer"
      ? "max-h-24 lg:max-h-28 xl:max-h-32 overflow-y-auto pr-1"
      : "";

  const seeAllButton =
    mode === "sidebar" && onSeeAll ? (
      <button
        type="button"
        onClick={onSeeAll}
        className="text-xs font-medium text-foreground/60 hover:text-foreground/80 transition-colors"
        aria-label={t("shop.seeAllProducers")}
      >
        {t("shop.seeAll")}
      </button>
    ) : null;

  return (
    <ShopFilterCollapsible
      title={t("shop.producers")}
      count={categoryCount}
      collapsible={collapsible}
      headerAction={seeAllButton}
      className={className}
    >
      <div className={listContainerClass}>
        <ul className="flex flex-col gap-0.5">
          {collections
            .filter((collection) => collection.handle !== "wine-boxes")
            .map((collection, index) => {
              const isSelected =
                params.collection === collection.handle ||
                selectedProducers.includes(collection.handle);
              return (
                <li key={`${collection.handle}-${index}`}>
                  <Link
                    className={cn(
                      "flex w-full text-left transition-all transform cursor-pointer text-sm md:hover:translate-x-1 md:hover:opacity-80",
                      isSelected
                        ? "font-medium translate-x-1"
                        : hasSelectedCategory || selectedProducers.length > 0
                          ? "opacity-50"
                          : "",
                    )}
                    href={paths.shopCollection(collection.handle)}
                    aria-pressed={isSelected}
                    aria-label={t("shop.filterByCategory", {
                      name: collection.title,
                    })}
                    prefetch
                  >
                    {collection.title}
                  </Link>
                </li>
              );
            })}
        </ul>
      </div>
    </ShopFilterCollapsible>
  );
}
