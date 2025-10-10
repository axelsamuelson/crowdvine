import Link from "next/link";
import { Collection } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";

interface ShopLinksProps {
  collections: Collection[];
  align?: "left" | "right";
  label?: string;
  className?: string;
  onLinkClick?: () => void;
}

export function ShopLinks({
  collections,
  label = "Shop",
  align = "left",
  className,
  onLinkClick,
}: ShopLinksProps) {
  // Debug: Log collections data
  console.log("🔍 ShopLinks:", {
    label,
    collectionsLength: collections?.length || 0,
    collections: collections?.slice(0, 3), // Show first 3
  });

  // Filter out wine-boxes
  const filteredCollections = collections?.filter(
    (collection) => collection.handle !== "wine-boxes"
  ) || [];

  console.log("✅ Filtered collections:", filteredCollections.length);

  return (
    <div
      className={cn(align === "right" ? "text-right" : "text-left", className)}
    >
      <h4 className="text-lg font-extrabold md:text-xl">{label}</h4>

      {/* Debug info */}
      {filteredCollections.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">
          No producers found ({collections?.length || 0} total collections)
        </p>
      )}

      <ul className="flex flex-col gap-1.5 leading-5 mt-5">
        {filteredCollections.map((item, index) => (
          <li key={`${item.handle}-${index}`}>
            <Link 
              href={`/shop/${item.handle}`} 
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
