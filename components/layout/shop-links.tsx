import Link from "next/link";
import { Collection } from "@/lib/shopify/types";
import type { AppLocale } from "@/lib/i18n/locale";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";
import { cn } from "@/lib/utils";

interface ShopLinksProps {
  collections: Collection[];
  locale?: AppLocale;
  align?: "left" | "right";
  label?: string;
  /** Shown when no producer collections are available. */
  emptyMessage?: string;
  /** Max producers to show (Popular producers list). */
  limit?: number;
  className?: string;
  /** Optional overrides (PACT mobile menu redesign). */
  labelClassName?: string;
  listClassName?: string;
  linkClassName?: string;
  emptyMessageClassName?: string;
  onLinkClick?: () => void;
}

export function ShopLinks({
  collections,
  locale = "sv",
  label = "Shop",
  emptyMessage,
  limit = 10,
  align = "left",
  className,
  labelClassName,
  listClassName,
  linkClassName,
  emptyMessageClassName,
  onLinkClick,
}: ShopLinksProps) {
  const paths = localizedPathsForLocale(locale);
  const filteredCollections = (
    collections?.filter((collection) => collection.handle !== "wine-boxes") ||
    []
  ).slice(0, Math.max(0, limit));

  return (
    <div
      className={cn(align === "right" ? "text-right" : "text-left", className)}
    >
      <h4
        className={cn(
          "text-lg font-extrabold md:text-xl",
          labelClassName,
        )}
      >
        {label}
      </h4>

      {/* Debug info */}
      {filteredCollections.length === 0 && emptyMessage && (
        <p
          className={cn(
            "mt-2 text-sm text-gray-500",
            emptyMessageClassName,
          )}
        >
          {emptyMessage}
        </p>
      )}

      <ul
        className={cn(
          "mt-5 flex flex-col gap-1.5 leading-5",
          listClassName,
        )}
      >
        {filteredCollections.map((item, index) => (
          <li key={`${item.handle}-${index}`}>
            <Link
              href={paths.shopCollection(item.handle)}
              prefetch
              onClick={onLinkClick}
              className={cn("text-gray-900 hover:underline", linkClassName)}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
