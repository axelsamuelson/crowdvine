import { ShopLinks } from "../shop-links";
import { Collection } from "@/lib/shopify/types";
// import { getSiteContentByKey } from "@/lib/actions/content";

interface HomeSidebarProps {
  collections: Collection[];
}

export function HomeSidebar({ collections }: HomeSidebarProps) {
  // Static content for now - will be replaced with Pages Functions
  const heroTitle = "Welcome to Dirty Wine";
  const heroSubtitle = "Discover exceptional wines";
  const heroDescription1 = "Curated selection of premium wines";
  const heroDescription2 = "From the world's finest producers";

  return (
    <aside className="max-md:hidden col-span-4 h-screen sticky top-0 p-sides pt-top-spacing flex flex-col justify-between">
      <div>
        {heroTitle && (
          <p className="italic tracking-tighter text-base">{heroTitle}</p>
        )}
        {(heroSubtitle || heroDescription1 || heroDescription2) && (
          <div className="mt-5 text-base leading-tight">
            {heroSubtitle && <p>{heroSubtitle}</p>}
            {heroDescription1 && <p>{heroDescription1}</p>}
            {heroDescription2 && <p>{heroDescription2}</p>}
          </div>
        )}
      </div>
      <ShopLinks collections={collections} />
    </aside>
  );
}
