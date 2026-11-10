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
  /**
   * @deprecated Empty lists hide the whole section — never show a count/debug message.
   * Kept optional so call sites can drop the prop without breaking.
   */
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
  limit = 10,
  align = "left",
  className,
  labelClassName,
  listClassName,
  linkClassName,
  onLinkClick,
}: ShopLinksProps) {
  const paths = localizedPathsForLocale(locale);
  const filteredCollections = (
    collections?.filter((collection) => collection.handle !== "wine-boxes") ||
    []
  ).slice(0, Math.max(0, limit));

  // Never show label + debug empty copy (e.g. "0 samlingar") to customers.
  if (filteredCollections.length === 0) {
    return null;
  }

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
