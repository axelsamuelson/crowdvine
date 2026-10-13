"use client";

import { ArrowUpDown, ListFilter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";

type ShopMobileDockProps = {
  onFilter: () => void;
  onSort: () => void;
  onSearch: () => void;
  filterCount?: number;
  className?: string;
};

export function ShopMobileDock({
  onFilter,
  onSort,
  onSearch,
  filterCount = 0,
  className,
}: ShopMobileDockProps) {
  const { t } = useTranslations();

  const items = [
    {
      key: "filter",
      label: t("shop.filter"),
      onClick: onFilter,
      icon: ListFilter,
      badge: filterCount > 0 ? filterCount : null,
    },
    {
      key: "sort",
      label: t("shop.sortBy"),
      onClick: onSort,
      icon: ArrowUpDown,
      badge: null,
    },
    {
      key: "search",
      label: t("shop.searchTitle"),
      onClick: onSearch,
      icon: Search,
      badge: null,
    },
  ] as const;

  return (
    <nav
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 md:hidden",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
      aria-label={t("shop.filtersTitle")}
    >
      <div className="pointer-events-auto mx-auto flex w-[min(100%-1.5rem,22rem)] items-stretch justify-between gap-1 rounded-full border border-white/10 bg-stone-950/80 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={cn(
                "relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5",
                "text-white transition-colors hover:bg-white/10 active:bg-white/15",
              )}
            >
              <span className="relative inline-flex h-6 w-6 items-center justify-center">
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} />
                {item.badge != null ? (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold leading-none text-stone-900">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate text-[10px] font-medium leading-tight tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
