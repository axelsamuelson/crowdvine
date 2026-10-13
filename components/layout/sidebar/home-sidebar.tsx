import { ShopLinks } from "../shop-links";
import { Collection } from "@/lib/shopify/types";
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

  return (
    <aside className="max-md:hidden col-span-4 h-screen sticky top-0 p-sides pt-top-spacing flex flex-col justify-between">
      <div>
        <p className="italic tracking-tighter text-base">
          {t("home.sidebarTagline")}
        </p>
      </div>
      <ShopLinks
        collections={collections}
        locale={locale}
        limit={10}
        label={t("home.popularProducers")}
        emptyMessage={t("home.noProducersFound", {
          count: collections?.length ?? 0,
        })}
      />
    </aside>
  );
}
