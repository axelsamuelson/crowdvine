"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  SHOP_SEARCH_SCOPES,
  type ShopSearchScope,
  type ShopSearchScopeCounts,
} from "@/lib/shop/shop-product-search";

type ShopSearchScopeTabsProps = {
  value: ShopSearchScope;
  onChange: (scope: ShopSearchScope) => void;
  counts: ShopSearchScopeCounts;
  className?: string;
};

/**
 * Vercel-style underline tabs adapted for the always-light shop shell.
 * Shows live result counts per scope while searching.
 */
export function ShopSearchScopeTabs({
  value,
  onChange,
  counts,
  className,
}: ShopSearchScopeTabsProps) {
  const { t } = useTranslations();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverStyle, setHoverStyle] = useState<{ left: string; width: string }>({
    left: "0px",
    width: "0px",
  });
  const [activeStyle, setActiveStyle] = useState<{ left: string; width: string }>({
    left: "0px",
    width: "0px",
  });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, SHOP_SEARCH_SCOPES.indexOf(value));

  const scopeLabel = (scope: ShopSearchScope) => {
    switch (scope) {
      case "wine":
        return t("shop.searchScopeWine");
      case "producer":
        return t("shop.searchScopeProducer");
      case "grape":
        return t("shop.searchScopeGrape");
      case "all":
      default:
        return t("shop.searchScopeAll");
    }
  };

  useEffect(() => {
    if (hoveredIndex === null) return;
    const el = tabRefs.current[hoveredIndex];
    if (!el) return;
    setHoverStyle({
      left: `${el.offsetLeft}px`,
      width: `${el.offsetWidth}px`,
    });
  }, [hoveredIndex]);

  useEffect(() => {
    const el = tabRefs.current[activeIndex];
    if (!el) return;
    const sync = () =>
      setActiveStyle({
        left: `${el.offsetLeft}px`,
        width: `${el.offsetWidth}px`,
      });
    sync();
    const id = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(id);
  }, [activeIndex, counts, value]);

  return (
    <div
      className={cn("relative w-full overflow-x-auto pb-1", className)}
      role="tablist"
      aria-label={t("shop.searchScopeAria")}
    >
      <div
        className="pointer-events-none absolute h-[30px] rounded-md bg-neutral-100 transition-all duration-300 ease-out dark:bg-neutral-100"
        style={{
          ...hoverStyle,
          opacity: hoveredIndex !== null ? 1 : 0,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 h-0.5 bg-neutral-900 transition-all duration-300 ease-out dark:bg-neutral-900"
        style={activeStyle}
        aria-hidden
      />

      <div className="relative flex items-center gap-0.5">
        {SHOP_SEARCH_SCOPES.map((scope, index) => {
          const count = counts[scope];
          const isActive = scope === value;
          const disabled = scope !== "all" && count === 0;

          return (
            <button
              key={scope}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={disabled}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
              onClick={() => {
                if (disabled) return;
                onChange(scope);
              }}
              className={cn(
                "relative z-[1] flex h-[30px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15",
                disabled && "cursor-not-allowed opacity-40",
                isActive
                  ? "font-semibold text-neutral-900 dark:text-neutral-900"
                  : "font-normal text-neutral-500 dark:text-neutral-500",
              )}
            >
              <span>{scopeLabel(scope)}</span>
              <span
                className={cn(
                  "tabular-nums text-xs",
                  isActive ? "text-neutral-500" : "text-neutral-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
