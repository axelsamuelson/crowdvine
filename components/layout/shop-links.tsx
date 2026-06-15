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
  className?: string;
  onLinkClick?: () => void;
}

export function ShopLinks({
  collections,
  locale = "sv",
  label = "Shop",
  emptyMessage,
  align = "left",
  className,
  onLinkClick,
}: ShopLinksProps) {
  const paths = localizedPathsForLocale(locale);
  const filteredCollections =
    collections?.filter((collection) => collection.handle !== "wine-boxes") ||
    [];

  return (
    <div
      className={cn(align === "right" ? "text-right" : "text-left", className)}
    >
      <h4 className="text-lg font-extrabold md:text-xl">{label}</h4>

      {/* Debug info */}
      {filteredCollections.length === 0 && emptyMessage && (
        <p className="text-sm text-gray-500 mt-2">{emptyMessage}</p>
      )}

      <ul className="flex flex-col gap-1.5 leading-5 mt-5">
        {filteredCollections.map((item, index) => (
          <li key={`${item.handle}-${index}`}>
            <Link
              href={paths.shopCollection(item.handle)}
              prefetch
              onClick={onLinkClick}
              className="hover:underline text-gray-900"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
