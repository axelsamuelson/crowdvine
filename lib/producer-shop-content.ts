import type { AppLocale } from "@/lib/i18n/locale";

/** Shop-page editorial keyed by producer handle — commerce-focused, distinct from profile bio. */
const PRODUCER_SHOP_EDITORIAL: Record<
  string,
  Partial<Record<AppLocale, string>>
> = {
  "le-bouc-a-trois-pattes": {
    sv: "Här köper du Le Bouc à Trois Pattes viner direkt från vingården — lätta röda, orangeviner och säsongsbetonade cuvéer som varierar från år till år.\n\nVälj bland tillgängliga flaskor i listan ovan och reservera innan pallen till Stockholm fylls. När tillräckligt många beställt packar producenten och skickar direkt till Sverige — utan importör, grossist eller butikskedja.\n\nPriserna på PACT är direktimporterade. Hemleverans i Stockholm när din beställning ingår i en fylld pall.",
    en: "Here you buy Le Bouc à Trois Pattes wines direct from the vineyard — light reds, orange wines and seasonal cuvées that vary from year to year.\n\nChoose from available bottles in the list above and reserve before the pallet to Stockholm fills. When enough people have ordered, the producer packs and ships direct to Sweden — no importer, wholesaler or retail chain.\n\nPrices at PACT are direct imported. Home delivery in Stockholm when your order is part of a full pallet.",
  },
  "hors-saison": {
    sv: "Hors Saison-vinerna på PACT är direktimporterade från vingården i Languedoc — lätta röda och friska vita som passar vardagsmat och spontana middagar.\n\nReservera de flaskor du vill ha i listan ovan. När pallen till Stockholm fylls skickas beställningarna direkt från producenten, utan mellanhänder och utan långa lagerled.\n\nDu får bättre pris än i butik och tillgång till flaskor som sällan finns på Systembolaget.",
    en: "Hors Saison wines at PACT are direct imported from the vineyard in Languedoc — light reds and fresh whites that suit everyday meals and spontaneous dinners.\n\nReserve the bottles you want from the list above. When the pallet to Stockholm fills, orders ship direct from the producer — no middlemen and no long supply chains.\n\nYou get better value than in stores and access to bottles rarely found at the monopoly.",
  },
  meigoon: {
    sv: "Meigoons viner på PACT säljs direkt från producenten i Languedoc — små partier naturvin med begränsad tillgänglighet.\n\nBläddra bland tillgängliga flaskor ovan och reservera innan pallen till Stockholm fylls. När tillräckligt många beställt skickas vinet direkt från vingården till dig.\n\nDirektimport via PACT ger lägre pris och färskare flaskor än via traditionella importkedjor.",
    en: "Meigoon's wines at PACT are sold direct from the producer in Languedoc — small batches of natural wine with limited availability.\n\nBrowse available bottles above and reserve before the pallet to Stockholm fills. When enough people have ordered, wine ships direct from the vineyard to you.\n\nDirect import via PACT gives lower prices and fresher bottles than through traditional import chains.",
  },
};

export function getProducerShopEditorialOverride(
  handle: string,
  locale: AppLocale,
): string | null {
  const normalized = handle.trim().toLowerCase();
  const text = PRODUCER_SHOP_EDITORIAL[normalized]?.[locale];
  return text?.trim() ? text.trim() : null;
}
