import { ShopLinks } from "../shop-links";
import { Collection } from "@/lib/shopify/types";
import { getHomepageHeroCopy } from "@/lib/get-homepage-hero-copy";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { translate } from "@/lib/i18n/messages";

interface HomeSidebarProps {
  collections: Collection[];
}

export async function HomeSidebar({ collections }: HomeSidebarProps) {
  const ctx = await getShoppingContextFromRequest().catch(() =>
    fallbackShoppingContext(),
  );
  const locale = ctx.locale;
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);

  const copy = await getHomepageHeroCopy(locale);
  const heroTitle = copy.titleLines.join(" ");

  return (
    <aside className="max-md:hidden col-span-4 h-screen sticky top-0 p-sides pt-top-spacing flex flex-col justify-between">
      <div>
        {heroTitle ? (
          <p className="italic tracking-tighter text-base">{heroTitle}</p>
        ) : null}
        {(copy.subtitle || copy.description1 || copy.description2) && (
          <div className="mt-5 text-base leading-tight">
            {copy.subtitle ? <p>{copy.subtitle}</p> : null}
            {copy.description1 ? <p>{copy.description1}</p> : null}
            {copy.description2 ? <p>{copy.description2}</p> : null}
          </div>
        )}
      </div>
      <ShopLinks
        collections={collections}
        locale={locale}
        label={t("home.popularProducers")}
        emptyMessage={t("home.noProducersFound", {
          count: collections?.length ?? 0,
        })}
      />
    </aside>
  );
}
