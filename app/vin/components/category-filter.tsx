"use client";

import { producerDisplayName } from "@/lib/producer-display-name";
import { Collection } from "@/lib/shopify/types";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCategoryFilterCount } from "../hooks/use-filter-count";
import { useQueryState, parseAsString } from "nuqs";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { ShopFilterCollapsible } from "./shop-filter-collapsible";
import {
  ShopFilterOptionContent,
  shopFilterOptionClassName,
  shopFilterSheetListClassName,
} from "./shop-filter-option";

function collectionLabel(collection: Collection): string {
  return producerDisplayName({
    name: collection.title,
    display_name: collection.displayName,
  });
}

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
  const categoryCount = useCategoryFilterCount();
  const collapsible = mode !== "overlay";
  const isSheet = mode === "drawer";

  const selectedProducers = producersParam
    ? producersParam.split(",").filter(Boolean)
    : [];

  // Only real producer handles — wine category path segments (e.g.
  // rott-naturvin) must not count as a selected producer.
  const selectedTitles = collections
    .filter((collection) => collection.handle !== "wine-boxes")
    .filter(
      (collection) =>
        params.collection === collection.handle ||
        selectedProducers.includes(collection.handle),
    )
    .map((collection) => collectionLabel(collection));
  // Prefer concrete selection length so colour/farming/grape pages never
  // open Producenter with a phantom (1).
  const producerCount = selectedTitles.length;
  const selectionSummary = isSheet
    ? selectedTitles.join(", ") || undefined
    : undefined;

  const listContainerClass =
    mode === "drawer"
      ? shopFilterSheetListClassName()
      : mode === "sidebar"
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
      count={isSheet ? producerCount : categoryCount}
      selectionSummary={selectionSummary}
      density={isSheet ? "sheet" : "default"}
      collapsible={collapsible}
      headerAction={seeAllButton}
      className={className}
    >
      <div className={listContainerClass}>
        <ul className="flex flex-col gap-0.5">
          {collections
            .filter((collection) => collection.handle !== "wine-boxes")
            .map((collection, index) => {
              const label = collectionLabel(collection);
              const isSelected =
                params.collection === collection.handle ||
                selectedProducers.includes(collection.handle);
              return (
                <li key={`${collection.handle}-${index}`}>
                  <Link
                    className={shopFilterOptionClassName(isSelected, {
                      density: isSheet ? "sheet" : "default",
                    })}
                    href={paths.shopCollection(collection.handle)}
                    aria-pressed={isSelected}
                    aria-label={t("shop.filterByCategory", {
                      name: label,
                    })}
                    prefetch
                  >
                    <ShopFilterOptionContent selected={isSelected}>
                      {label}
                    </ShopFilterOptionContent>
                  </Link>
                </li>
              );
            })}
        </ul>
      </div>
    </ShopFilterCollapsible>
  );
}
