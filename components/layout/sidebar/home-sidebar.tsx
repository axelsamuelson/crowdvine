import { ShopLinks } from "../shop-links";
import { Collection } from "@/lib/shopify/types";
import { getSiteContentByKey } from "@/lib/actions/content";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/locale";

interface HomeSidebarProps {
  collections: Collection[];
}

async function heroLine(
  locale: AppLocale,
  baseKey: string,
  messageKey: string,
): Promise<string | null> {
  if (locale === "sv") {
    const sv = await getSiteContentByKey(`${baseKey}_sv`);
    if (sv?.trim()) return sv;
    return translate(locale, messageKey);
  }
  const en = await getSiteContentByKey(baseKey);
  if (en?.trim()) return en;
  return translate(locale, messageKey);
}

export async function HomeSidebar({ collections }: HomeSidebarProps) {
  const ctx = await getShoppingContextFromRequest().catch(() =>
    fallbackShoppingContext(),
  );
  const locale = ctx.locale;
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(locale, key, params);

  const [heroTitle, heroSubtitle, heroDescription1, heroDescription2] =
    await Promise.all([
      heroLine(locale, "homepage_hero_title", "home.heroTitle"),
      heroLine(locale, "homepage_hero_subtitle", "home.heroSubtitle"),
      heroLine(locale, "homepage_hero_description_1", "home.heroDescription1"),
      heroLine(locale, "homepage_hero_description_2", "home.heroDescription2"),
    ]);

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
