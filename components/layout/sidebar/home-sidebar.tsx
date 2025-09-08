import { ShopLinks } from "../shop-links";
import { Collection } from "@/lib/shopify/types";
import { getSiteContentByKey } from "@/lib/actions/content";

interface HomeSidebarProps {
  collections: Collection[];
}

export async function HomeSidebar({ collections }: HomeSidebarProps) {
  // Hämta hero-text från databasen
  const [
    heroTitle,
    heroSubtitle,
    heroDescription1,
    heroDescription2
  ] = await Promise.all([
    getSiteContentByKey('homepage_hero_title'),
    getSiteContentByKey('homepage_hero_subtitle'),
    getSiteContentByKey('homepage_hero_description_1'),
    getSiteContentByKey('homepage_hero_description_2')
  ]);

  return (
    <aside className="max-md:hidden col-span-4 h-screen sticky top-0 p-sides pt-top-spacing flex flex-col justify-between">
      <div>
        {heroTitle && (
          <p className="italic tracking-tighter text-base">
            {heroTitle}
          </p>
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
