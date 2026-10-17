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
      <div
        className={cn(
          // Match MENU button glass: bg-background/10 backdrop-blur-lg
          "pointer-events-auto mx-auto flex w-fit max-w-[min(100%-2.5rem,16rem)] items-stretch justify-center gap-0.5",
          "rounded-full border border-border/40 bg-background/10 px-1.5 py-1 shadow-sm backdrop-blur-lg",
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={cn(
                "relative flex w-[4.25rem] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-1.5",
                "text-foreground transition-colors hover:bg-background/20 active:bg-background/30",
              )}
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {item.badge != null ? (
                  <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold leading-none text-background">
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
