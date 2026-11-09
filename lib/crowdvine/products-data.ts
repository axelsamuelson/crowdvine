import { supabaseBuildUsesPlaceholder } from "@/lib/supabase-build-placeholder";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { wineDisplayTitle } from "@/lib/wine-display-title";
import { getAppUrl, getInternalFetchHeaders } from "@/lib/app-url";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import {
  extractWineText,
  type WineLocale,
} from "@/lib/i18n/wine-locale";
import { resolveProductAvailableForSale } from "@/lib/wine-availability";
import { getAllWineBoxCalculations } from "@/lib/wine-box-calculations";
import {
  buildWineBoxSeoDescription,
  buildWineBoxSeoTitle,
} from "@/lib/seo/wine-box-metadata";
import { calculateRoundedB2BPriceExclVat } from "@/lib/price-breakdown";
import { resolveWineAlcoholTaxCents } from "@/lib/wine-alcohol-tax";
import { convertSekForDisplay } from "@/lib/shopping-context/currency-convert";
import {
  getSekToDisplayRate,
  resolveDisplayCurrency,
} from "@/lib/shopping-context/display-currency";
import {
  roundAmountForDisplay,
} from "@/lib/shopping-context/format";
import {
  aggregateB2BPalletStockWithFullPalletTotals,
  B2B_PALLET_ITEM_STOCK_SELECT,
  fetchB2BWineAvailability,
  fetchB2BWineIsNew,
  type B2BWineAvailability,
} from "@/lib/b2b-pallet-stock";
import { applyB2BPalletShippedSortIfNeeded } from "@/lib/b2b-pallet-shipped-sort";
import { filterProductsByFarming } from "@/lib/shop/farming-filter";

async function resolveProductDisplayCurrency(params?: {
  displayCurrencyCode?: string;
  sekToDisplayRate?: number;
}): Promise<{ displayCurrencyCode: string; sekToDisplayRate: number }> {
  let code = params?.displayCurrencyCode?.trim().toUpperCase();
  let rate = params?.sekToDisplayRate;
  if (!code) {
    try {
      const d = await resolveDisplayCurrency();
      code = d.currencyCode;
      rate = d.sekToDisplayRate;
    } catch {
      code = "SEK";
      rate = 1;
    }
  } else if (rate == null || !Number.isFinite(rate)) {
    rate = await getSekToDisplayRate(code);
  }
  return { displayCurrencyCode: code || "SEK", sekToDisplayRate: rate ?? 1 };
}

function displayPriceFromSek(
  amountSek: number,
  displayCurrencyCode: string,
  sekToDisplayRate: number,
  round: "ceil" | "round" = "ceil",
) {
  const v = convertSekForDisplay(amountSek, displayCurrencyCode, sekToDisplayRate);
  const n = roundAmountForDisplay(v, displayCurrencyCode, round);
  return { amount: n.toString(), currencyCode: displayCurrencyCode };
}

async function fetchExchangeRatesMap(
  currencies: string[],
): Promise<Record<string, number>> {
  const map: Record<string, number> = { SEK: 1 };
  const toFetch = [...new Set(currencies.filter((c) => c && c !== "SEK"))];
  if (toFetch.length === 0) return map;
  const base = getAppUrl();
  const headers = getInternalFetchHeaders();
  await Promise.all(
    toFetch.map(async (c) => {
      try {
        const res = await fetch(
          `${base}/api/exchange-rates?from=${c}&to=SEK`,
          { cache: "no-store", headers },
        );
        const data = res.ok ? await res.json() : null;
        if (data?.rate && Number.isFinite(data.rate)) map[c] = data.rate;
      } catch {
        /* ignore */
      }
    }),
  );
  return map;
}

async function fetchB2BStockAndShippingFromPallets(
  sb: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  wineIds: string[],
): Promise<{ stockMap: Map<string, number>; shippingMap: Map<string, number> }> {
  if (wineIds.length === 0) {
    return { stockMap: new Map(), shippingMap: new Map() };
  }
  try {
    const { data: palletItems, error } = await sb
      .from("b2b_pallet_shipment_items")
      .select(B2B_PALLET_ITEM_STOCK_SELECT)
      .in("wine_id", wineIds)
      .eq("b2b_pallet_shipments.is_active", true);
    if (error) {
      const fallback = await sb
        .from("b2b_pallet_shipment_items")
        .select("wine_id, quantity, quantity_sold, shipment_id, b2b_pallet_shipments!inner(is_active)")
        .in("wine_id", wineIds);
      const sellable = (fallback.data || []).filter((row: any) =>
        row.b2b_pallet_shipments?.is_active !== false,
      );
      return aggregateB2BPalletStockWithFullPalletTotals(sb, sellable, {
        sellableOnly: true,
      });
    }
    return aggregateB2BPalletStockWithFullPalletTotals(sb, palletItems || [], {
      sellableOnly: true,
    });
  } catch {
    return { stockMap: new Map(), shippingMap: new Map() };
  }
}

/** Escape `%`, `_`, `\` for use inside PostgreSQL ILIKE patterns (PostgREST). */
function escapeForIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * PostgREST `.or("a,b,c")` splits on commas at the top level — commas inside the
 * pattern would break the clause. Normalize so the ILIKE value never contains commas.
 */
function normalizeShopSearchInput(raw: string): string {
  return raw
    .trim()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Build a PostgREST `ilike` value for `.or(...)`.
 *
 * Note: Using double quotes around the value (e.g. `ilike."%foo%"`) can trigger
 * PGRST100 parse errors. Supabase/PostgREST will URL-encode spaces safely, so we
 * pass the raw pattern (with commas already normalized out).
 */
function postgrestIlikeValue(val: string): string {
  return val;
}

function supabaseErrorToMessage(err: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}): string {
  return (
    [err.message, err.details, err.hint, err.code].filter(Boolean).join(" | ") ||
    "Supabase request failed"
  );
}

type SupabaseOrBuilder = {
  or: (
    clause: string,
    options?: {
      /** PostgREST: apply OR clause against a related table */
      foreignTable?: string;
    },
  ) => SupabaseOrBuilder;
};

/**
 * PostgREST `.or(...)` clause for shop search.
 * `description` is JSONB (`{ sv, en }`) — cannot use `description.ilike` directly.
 */
function wineCatalogSearchOrClause(rawSearch: string): string | null {
  const t = normalizeShopSearchInput(rawSearch);
  if (!t) return null;
  const p = postgrestIlikeValue(`%${escapeForIlikePattern(t)}%`);
  return [
    `wine_name.ilike.${p}`,
    `handle.ilike.${p}`,
    `grape_varieties.ilike.${p}`,
    `description->>sv.ilike.${p}`,
    `description->>en.ilike.${p}`,
  ].join(",");
}

/**
 * Full catalog: wine fields + joined producer name (`producers!inner` is on the same query).
 */
function applyWineCatalogSearch<Q extends SupabaseOrBuilder>(
  qb: Q,
  rawSearch: string | undefined,
): Q {
  const clause = wineCatalogSearchOrClause(rawSearch ?? "");
  if (!clause) return qb;
  return qb.or(clause) as Q;
}

function applyProducerNameSearch<Q extends SupabaseOrBuilder>(
  qb: Q,
  rawSearch: string | undefined,
): Q {
  const t = normalizeShopSearchInput(rawSearch ?? "");
  if (!t) return qb;
  const p = postgrestIlikeValue(`%${escapeForIlikePattern(t)}%`);
  return qb.or(`name.ilike.${p},display_name.ilike.${p}`, {
    foreignTable: "producers",
  }) as Q;
}

/** Collection (single producer): wine fields + producer name (same row’s `producers(name)` embed). */
function applyWineCollectionSearch<Q extends SupabaseOrBuilder>(
  qb: Q,
  rawSearch: string | undefined,
): Q {
  const clause = wineCatalogSearchOrClause(rawSearch ?? "");
  if (!clause) return qb;
  return qb.or(clause) as Q;
}

function applyProducerNameSearchForCollection<Q extends SupabaseOrBuilder>(
  qb: Q,
  rawSearch: string | undefined,
): Q {
  // In a single-producer collection, producer-name search is still useful
  // (e.g. if the shop UI uses the same query state everywhere).
  return applyProducerNameSearch(qb, rawSearch);
}

function convertToFullUrl(path: string | null | undefined): string {
  if (!path) return getAppUrl() + DEFAULT_WINE_IMAGE_PATH;

  const cleanPath = path.trim().replace(/\n/g, "");
  if (
    !cleanPath ||
    cleanPath === DEFAULT_WINE_IMAGE_PATH ||
    /default-wine\.png$/i.test(cleanPath)
  ) {
    return getAppUrl() + DEFAULT_WINE_IMAGE_PATH;
  }

  if (cleanPath.startsWith("http")) return cleanPath;
  if (cleanPath.startsWith("/uploads/")) {
    const baseUrl = getAppUrl();
    const fileName = cleanPath.replace("/uploads/", "").trim();
    if (!fileName || /default-wine\.png$/i.test(fileName)) {
      return getAppUrl() + DEFAULT_WINE_IMAGE_PATH;
    }
    return `${baseUrl}/api/images/${fileName}`;
  }
  const baseUrl = getAppUrl();
  return `${baseUrl}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
}

const PRODUCER_ORGANIC_VERIFY_SELECT =
  "certification_verified_url, certification_in_conversion";

function rawProducerDisplayName(producers: unknown): string | null {
  const row = Array.isArray(producers) ? producers[0] : producers;
  if (!row || typeof row !== "object") return null;
  const value = (row as { display_name?: string | null }).display_name;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function producerOrganicVerificationFields(producers: unknown): {
  producerCertificationVerifiedUrl?: string | null;
  producerCertificationInConversion?: boolean;
} {
  const row = Array.isArray(producers) ? producers[0] : producers;
  if (!row || typeof row !== "object") return {};
  if (!("certification_verified_url" in row)) return {};
  const verifiedUrl = (row as { certification_verified_url?: string | null })
    .certification_verified_url;
  const inConversion =
    (row as { certification_in_conversion?: boolean | null })
      .certification_in_conversion === true;
  return {
    producerCertificationVerifiedUrl:
      verifiedUrl == null ? null : String(verifiedUrl),
    producerCertificationInConversion: inConversion,
  };
}

export interface ProductData {
  id: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  handle: string;
  productType: string;
  categoryId: string;
  producerId: string;
  producerName: string;
  /** Raw producers.display_name. */
  producerDisplayName?: string | null;
  /** PACT Points checkout boost (from producers.boost_active). */
  producerBoostActive?: boolean;
  options: Array<{ id: string; name: string; values: Array<{ id: string; name: string } | string> }>;
  variants: Array<{
    id: string;
    title: string;
    availableForSale: boolean;
    price: { amount: string; currencyCode: string };
    selectedOptions: Array<{ name: string; value: string }>;
  }>;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  /** SEK list price in öre when known (wines + wine boxes). */
  priceBreakdown?: { basePriceCents?: number };
  featuredImage: { id: string; url: string; altText: string; width?: number; height?: number };
  images: Array<{ id: string; url: string; altText: string; width?: number; height?: number }>;
  seo: { title: string; description: string };
  tags: string[];
  /** wines.farming certification (shop filter). */
  farming?: string | null;
  /** Canonical wines.region (allowlisted) for shop region filter. */
  region?: string | null;
  /**
   * Producer organic registry URL. `undefined` when column not selected;
   * `null` when loaded and unverified.
   */
  producerCertificationVerifiedUrl?: string | null;
  producerCertificationInConversion?: boolean;
  availableForSale: boolean;
  currencyCode: string;
  updatedAt: string;
  createdAt: string;
  /** B2B price exkl moms when b2b_margin_percentage is set */
  b2bPriceExclVat?: number;
  /** B2B stock quantity (wines only). Null/0 = out of stock. Used for stock badges. */
  b2bStock?: number | null;
  /** Dirtywine assortment state. Absent on pactwines.com. */
  b2bAvailability?: B2BWineAvailability;
  /** True when wine is on a Dirty Wine pallet marked is_new. */
  b2bIsNew?: boolean;
}

/**
 * Fetch all products directly from DB. Use for SSR to avoid HTTP 401.
 */
type WineCatalogQuery = ReturnType<
  ReturnType<Awaited<ReturnType<typeof getSupabaseAdmin>>["from"]>
>;

function applyWineCatalogFilters<Q extends WineCatalogQuery>(
  query: Q,
  filters?: {
    filterColor?: string[];
    filterTags?: string[];
    filterIsNatural?: boolean;
    filterFarming?: string[];
    filterGrape?: string;
    filterCountryCode?: string;
    filterRegion?: string;
    filterWineRegion?: string;
  },
): Q {
  let q = query;
  if (filters?.filterColor?.length) {
    q = q.in("color", filters.filterColor) as Q;
  }
  if (filters?.filterIsNatural === true) {
    q = q.eq("is_natural", true) as Q;
  }
  if (filters?.filterFarming?.length) {
    q = q.in("farming", filters.filterFarming) as Q;
  }
  if (filters?.filterTags?.length) {
    for (const tag of filters.filterTags) {
      q = q.contains("tags", [tag]) as Q;
    }
  }
  if (filters?.filterGrape) {
    q = q.ilike("grape_varieties", `%${filters.filterGrape}%`) as Q;
  }
  if (filters?.filterCountryCode) {
    q = q.eq("producers.country_code", filters.filterCountryCode) as Q;
  }
  if (filters?.filterRegion) {
    q = q.eq("producers.region", filters.filterRegion) as Q;
  }
  if (filters?.filterWineRegion) {
    q = q.eq("region", filters.filterWineRegion) as Q;
  }
  return q;
}

export async function fetchProductsData(params?: {
  limit?: number;
  sortKey?: string;
  reverse?: boolean;
  /** Case-insensitive match on title, handle, description, grapes, producer (shop `?q=`). */
  searchQuery?: string;
  /** Locale for description JSONB extraction (shop path). Defaults to sv. */
  locale?: WineLocale;
  /** When false (pactwines.com), all wines availableForSale. When true (dirtywine.se), B2B stock applies. */
  isB2BSite?: boolean;
  displayCurrencyCode?: string;
  sekToDisplayRate?: number;
  /** Match wines.color exactly, e.g. ["Red"], ["White"]. */
  filterColor?: string[];
  /** Each tag must exist in wines.tags (array contains). */
  filterTags?: string[];
  /** When true, only wines with is_natural = true. */
  filterIsNatural?: boolean;
  /** Match wines.farming (e.g. natural, organic_certified). */
  filterFarming?: string[];
  /** Case-insensitive match on grape_varieties. */
  filterGrape?: string;
  /** Match producers.country_code (ISO), e.g. "FR". Requires producers!inner. */
  filterCountryCode?: string;
  /** Match producers.region, e.g. "Languedoc". Requires producers!inner. */
  filterRegion?: string;
  /** Match wines.region (allowlisted French name). */
  filterWineRegion?: string;
  /** When set, only these wine ids. */
  ids?: readonly string[];
}): Promise<ProductData[]> {
  const idList = (params?.ids ?? []).filter((id) => id.length > 0);
  const limit = idList.length > 0 ? idList.length : (params?.limit ?? 200);
  const sortKey = params?.sortKey || "RELEVANCE";
  const reverse = params?.reverse ?? false;
  // Missing host / omitted flag must stay B2C so pact pages never hide wines.
  const isB2BSite = params?.isB2BSite ?? false;
  const wineLocale: WineLocale = params?.locale ?? "sv";
  // Hidden wines are removed after stock is known, so the SQL read has to
  // include the whole live catalog before the caller's limit is applied.
  const sqlLimit = isB2BSite ? Math.max(limit, 5000) : limit;
  const { displayCurrencyCode, sekToDisplayRate } =
    await resolveProductDisplayCurrency(params);

  const sb = getSupabaseAdmin();

  const winesSelect = `
      id,
      wine_name,
      vintage,
      grape_varieties,
      color,
      handle,
      base_price_cents,
      cost_amount,
      cost_currency,
      exchange_rate,
      alcohol_tax_cents,
      margin_percentage,
      b2b_margin_percentage,
      b2b_stock,
      label_image_path,
      producer_id,
      description,
      description_html,
      tags,
      farming,
      region,
      is_natural,
      available_for_sale,
      source_type,
      created_at,
      producers!inner(name, display_name, is_live, boost_active, country_code, ${PRODUCER_ORGANIC_VERIFY_SELECT})
    `;

  const categoryFilters = {
    filterColor: params?.filterColor,
    filterTags: params?.filterTags,
    filterIsNatural: params?.filterIsNatural,
    filterFarming: params?.filterFarming,
    filterGrape: params?.filterGrape,
    filterCountryCode: params?.filterCountryCode,
    filterRegion: params?.filterRegion,
    filterWineRegion: params?.filterWineRegion,
  };

  const applySort = <Q extends { order: any }>(q: Q): Q => {
    switch (sortKey) {
      case "PRICE":
        return q.order("base_price_cents", { ascending: !reverse });
      case "CREATED_AT":
      case "CREATED":
        return q.order("created_at", { ascending: !reverse });
      default:
        return q.order("created_at", { ascending: false });
    }
  };

  const baseQuery = () => {
    let query = sb
      .from("wines")
      .select(winesSelect)
      .eq("is_live", true)
      .eq("producers.is_live", true);
    if (idList.length > 0) query = query.in("id", idList);
    return applyWineCatalogFilters(query, categoryFilters);
  };

  const hasSearch = Boolean(normalizeShopSearchInput(params?.searchQuery ?? ""));

  let result: { data: any[] | null; error: any | null };
  if (!hasSearch) {
    result = await applySort(baseQuery()).limit(sqlLimit);
  } else {
    // PostgREST cannot express a single OR group spanning both the root table and an embedded
    // relation (producers) in one `.or(...)` clause. We run two queries and merge.
    const wineResult = await applySort(
      applyWineCatalogSearch(baseQuery(), params?.searchQuery),
    ).limit(sqlLimit);
    const producerResult = await applySort(
      applyProducerNameSearch(baseQuery(), params?.searchQuery),
    ).limit(sqlLimit);

    if (wineResult.error) {
      result = wineResult;
    } else if (producerResult.error) {
      result = producerResult;
    } else {
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const row of [...(wineResult.data ?? []), ...(producerResult.data ?? [])]) {
        const id = String((row as any)?.id ?? "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(row);
        if (merged.length >= sqlLimit) break;
      }
      result = { data: merged, error: null };
    }
  }

  if (result.error) {
    const msg = result.error.message ?? "";
    const filtersForRetry = categoryFilters;
    const omitOrganicVerify =
      /certification_verified_url|certification_in_conversion/i.test(msg);
    const producerEmbedBase = omitOrganicVerify
      ? "name, boost_active, country_code"
      : `name, boost_active, country_code, ${PRODUCER_ORGANIC_VERIFY_SELECT}`;
    const producerEmbed = /display_name/i.test(msg)
      ? producerEmbedBase
      : producerEmbedBase.replace("name, ", "name, display_name, ");
    const fallbackSelect = `
      id, wine_name, vintage, grape_varieties, color, handle, base_price_cents,
      cost_amount, cost_currency, exchange_rate, alcohol_tax_cents, margin_percentage,
      b2b_margin_percentage, b2b_stock, label_image_path, producer_id, description,
      description_html, tags, farming, region, is_natural, available_for_sale, source_type, created_at,
      producers!inner(${producerEmbed})
    `;
    if (
      /is_live|column.*does not exist|could not find.*column|producers\.is_live|certification_verified_url|certification_in_conversion|display_name/i.test(
        msg,
      )
    ) {
      const fbBase = () =>
        applyWineCatalogFilters(
          sb.from("wines").select(fallbackSelect).eq("is_live", true),
          filtersForRetry,
        );
      const fbHasSearch = hasSearch;
      if (!fbHasSearch) {
        result = await applySort(fbBase()).limit(sqlLimit);
      } else {
        const wineResult = await applySort(
          applyWineCatalogSearch(fbBase(), params?.searchQuery),
        ).limit(sqlLimit);
        const producerResult = await applySort(
          applyProducerNameSearch(fbBase(), params?.searchQuery),
        ).limit(sqlLimit);

        if (wineResult.error) {
          result = wineResult;
        } else if (producerResult.error) {
          result = producerResult;
        } else {
          const seen = new Set<string>();
          const merged: any[] = [];
          for (const row of [...(wineResult.data ?? []), ...(producerResult.data ?? [])]) {
            const id = String((row as any)?.id ?? "");
            if (!id || seen.has(id)) continue;
            seen.add(id);
            merged.push(row);
            if (merged.length >= sqlLimit) break;
          }
          result = { data: merged, error: null };
        }
      }
    }
    if (result.error) {
      const msg2 = result.error.message ?? "";
      const filtersForRetry2 = filtersForRetry;
      if (
        /is_live|column.*does not exist|could not find.*column/i.test(
          msg2,
        )
      ) {
        const fbBase = () =>
          applyWineCatalogFilters(
            sb.from("wines").select(fallbackSelect),
            filtersForRetry2,
          );
        if (!hasSearch) {
          result = await applySort(fbBase()).limit(sqlLimit);
        } else {
          const wineResult = await applySort(
            applyWineCatalogSearch(fbBase(), params?.searchQuery),
          ).limit(sqlLimit);
          const producerResult = await applySort(
            applyProducerNameSearch(fbBase(), params?.searchQuery),
          ).limit(sqlLimit);

          if (wineResult.error) {
            result = wineResult;
          } else if (producerResult.error) {
            result = producerResult;
          } else {
            const seen = new Set<string>();
            const merged: any[] = [];
            for (const row of [...(wineResult.data ?? []), ...(producerResult.data ?? [])]) {
              const id = String((row as any)?.id ?? "");
              if (!id || seen.has(id)) continue;
              seen.add(id);
              merged.push(row);
              if (merged.length >= sqlLimit) break;
            }
            result = { data: merged, error: null };
          }
        }
      }
    }
    if (result.error) {
      throw new Error(supabaseErrorToMessage(result.error));
    }
  }

  const rawData = (result.data ?? []) as any[];
  const currencies = [
    ...new Set(
      rawData
        .map((w: any) => w.cost_currency || "EUR")
        .filter((c: string) => c),
    ),
  ] as string[];
  const wineIds = rawData.map((wine: any) => wine.id) || [];
  const wineImagesMap = new Map<string, any[]>();

  const [
    { stockMap: b2bStockMap, shippingMap: b2bShippingMap },
    rateMap,
    wineImagesResult,
  ] = await Promise.all([
      isB2BSite
        ? fetchB2BStockAndShippingFromPallets(sb, wineIds)
        : Promise.resolve({
            stockMap: new Map<string, number>(),
            shippingMap: new Map<string, number>(),
          }),
      fetchExchangeRatesMap(currencies),
      wineIds.length > 0
        ? sb
            .from("wine_images")
            .select("wine_id, image_path, alt_text, sort_order, is_primary")
            .in("wine_id", wineIds)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const sellableStockByWineId = new Map<string, number | null>();
  if (isB2BSite) {
    for (const wine of rawData) {
      const wineId = typeof wine?.id === "string" ? wine.id : "";
      if (!wineId) continue;
      const fromPallets = b2bStockMap.get(wineId);
      sellableStockByWineId.set(
        wineId,
        fromPallets != null
          ? fromPallets
          : wine.b2b_stock != null
            ? Number(wine.b2b_stock)
            : null,
      );
    }
  }
  const b2bAvailabilityByWineId = isB2BSite
    ? await fetchB2BWineAvailability(sb, wineIds, sellableStockByWineId)
    : new Map<string, B2BWineAvailability>();
  const b2bIsNewWineIds = isB2BSite
    ? await fetchB2BWineIsNew(sb, wineIds)
    : new Set<string>();

  wineImagesResult.data?.forEach((image: any) => {
    if (!wineImagesMap.has(image.wine_id)) wineImagesMap.set(image.wine_id, []);
    wineImagesMap.get(image.wine_id)!.push(image);
  });

  const products = rawData.map((i: any) => {
    const grapeVarieties = Array.isArray(i.grape_varieties)
      ? i.grape_varieties
      : i.grape_varieties
        ? i.grape_varieties.split(",").map((g: string) => g.trim())
        : [];
    const colorName = i.color_name || i.color;

    const wineImages = wineImagesMap.get(i.id) || [];
    const b2bStockFromPallets = b2bStockMap.get(i.id);
    const b2bStock =
      b2bStockFromPallets != null
        ? b2bStockFromPallets
        : i.b2b_stock != null
          ? Number(i.b2b_stock)
          : null;
    const availableForSale = resolveProductAvailableForSale({
      isB2BSite,
      b2bStock,
      availableForSale: i.available_for_sale,
    });
    const b2bAvailability = isB2BSite
      ? (b2bAvailabilityByWineId.get(i.id) ?? "hidden")
      : undefined;
    const b2bIsNew = isB2BSite ? b2bIsNewWineIds.has(i.id) : undefined;
    const images =
      wineImages.length > 0
        ? wineImages.map((img: any) => ({
            id: `${i.id}-img-${img.sort_order}`,
            url: convertToFullUrl(img.image_path),
            altText: img.alt_text || i.wine_name,
            width: 600,
            height: 600,
          }))
        : [
            {
              id: `${i.id}-img`,
              url: convertToFullUrl(i.label_image_path),
              altText: i.wine_name,
              width: 600,
              height: 600,
            },
          ];

    const rawDescription = extractWineText(
      i.description as Record<string, string> | string | null,
      wineLocale,
      wineLocale === "en" ? { fallback: false } : undefined,
    );
    const wineDescription = rawDescription || "";

    const safeDescriptionHtml =
      wineLocale === "en"
        ? wineDescription
          ? `<p>${wineDescription}</p>`
          : ""
        : typeof i.description_html === "string" && i.description_html
          ? i.description_html
          : wineDescription
            ? `<p>${wineDescription}</p>`
            : "";

    return {
      id: i.id,
      title: wineDisplayTitle(i.wine_name, i.vintage),
      description: wineDescription,
      descriptionHtml: safeDescriptionHtml,
      handle: i.handle,
      productType: "wine",
      categoryId: i.producer_id,
      producerId: i.producer_id,
      producerName: i.producers?.name || "Unknown Producer",
      producerDisplayName: rawProducerDisplayName(i.producers),
      sourceType:
        typeof i.source_type === "string" && i.source_type.trim()
          ? i.source_type.trim()
          : null,
      producerBoostActive: (i.producers as { boost_active?: boolean } | null)?.boost_active === true,
      ...producerOrganicVerificationFields(i.producers),
      options: [
        {
          id: "grape-varieties",
          name: "Grape Varieties",
          values: grapeVarieties.map((v: string) => ({
            id: v.toLowerCase().replace(/\s+/g, "-"),
            name: v,
          })),
        },
        {
          id: "color",
          name: "Color",
          values: colorName
            ? [{ id: colorName.toLowerCase().replace(/\s+/g, "-"), name: colorName }]
            : [],
        },
      ],
      variants: [
        {
          id: `${i.id}-default`,
          title: "750 ml",
          availableForSale,
          price: displayPriceFromSek(
            i.base_price_cents / 100,
            displayCurrencyCode,
            sekToDisplayRate,
          ),
          selectedOptions: [
            ...grapeVarieties.map((g: string) => ({ name: "Grape Varieties", value: g })),
            ...(colorName ? [{ name: "Color", value: colorName }] : []),
          ],
        },
      ],
      priceRange: {
        minVariantPrice: displayPriceFromSek(
          i.base_price_cents / 100,
          displayCurrencyCode,
          sekToDisplayRate,
        ),
        maxVariantPrice: displayPriceFromSek(
          i.base_price_cents / 100,
          displayCurrencyCode,
          sekToDisplayRate,
        ),
      },
      featuredImage: images[0] || {
        id: `${i.id}-img`,
        url: convertToFullUrl(i.label_image_path),
        altText: i.wine_name,
        width: 600,
        height: 600,
      },
      images,
      seo: { title: i.wine_name, description: "" },
      tags: [...grapeVarieties, ...(colorName ? [colorName] : [])],
      farming: (i.farming as string | null | undefined) ?? null,
      region: (i.region as string | null | undefined) ?? null,
      availableForSale,
      currencyCode: displayCurrencyCode,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      b2bStock: b2bStock ?? undefined,
      b2bAvailability,
      b2bIsNew,
      ...(i.b2b_margin_percentage != null &&
      i.b2b_margin_percentage >= 0 &&
      i.b2b_margin_percentage < 100
        ? {
            b2bPriceExclVat: calculateRoundedB2BPriceExclVat(
              i.cost_amount || 0,
              rateMap[(i.cost_currency || "EUR") as string] ??
                i.exchange_rate ??
                1,
              resolveWineAlcoholTaxCents(i.alcohol_tax_cents),
              i.b2b_margin_percentage,
              b2bShippingMap.get(i.id) ?? 0,
            ),
          }
        : {}),
      // Add priceBreakdown for price calculations
      priceBreakdown: {
        costAmount: i.cost_amount || 0,
        exchangeRate: rateMap[(i.cost_currency || "EUR") as string] ?? i.exchange_rate ?? 1,
        alcoholTaxCents: resolveWineAlcoholTaxCents(i.alcohol_tax_cents),
        marginPercentage: i.margin_percentage || 0,
        basePriceCents: i.base_price_cents,
        b2bMarginPercentage: i.b2b_margin_percentage ?? undefined,
        b2bShippingPerBottleSek: b2bShippingMap.get(i.id) ?? undefined,
        b2bPriceExclVat:
          i.b2b_margin_percentage != null &&
          i.b2b_margin_percentage >= 0 &&
          i.b2b_margin_percentage < 100
            ? calculateRoundedB2BPriceExclVat(
                i.cost_amount || 0,
                rateMap[(i.cost_currency || "EUR") as string] ??
                  i.exchange_rate ??
                  1,
                resolveWineAlcoholTaxCents(i.alcohol_tax_cents),
                i.b2b_margin_percentage,
                b2bShippingMap.get(i.id) ?? 0,
              )
            : undefined,
      },
    };
  });

  const visible = isB2BSite
    ? products.filter((product) => product.b2bAvailability !== "hidden")
    : products;

  // Organic category/filter: require verified registry URL (not in conversion).
  const farmingFiltered =
    params?.filterFarming?.includes("organic_certified")
      ? (filterProductsByFarming(visible as any, params.filterFarming) as typeof visible)
      : visible;

  // Dirty Wine Newest/Oldest: when the wine's pallet shipped, not wines.created_at.
  const sorted = await applyB2BPalletShippedSortIfNeeded(farmingFiltered, {
    sb,
    isB2BSite,
    sortKey,
    reverse,
  });

  return sorted.slice(0, limit);
}

/**
 * Fetch products for a collection (producer or wine-boxes) directly from DB.
 */
export async function fetchCollectionProductsData(
  collectionId: string,
  params?: {
    limit?: number;
    /** Case-insensitive match on title, handle, description, grapes (shop `?q=`). */
    searchQuery?: string;
    /** Locale for description JSONB extraction (shop path). Defaults to sv. */
    locale?: WineLocale;
    /** When false (pactwines.com), all wines availableForSale. When true (dirtywine.se), B2B stock applies. */
    isB2BSite?: boolean;
    displayCurrencyCode?: string;
    sekToDisplayRate?: number;
  },
): Promise<ProductData[]> {
  const limit = params?.limit ?? 200;
  const isB2BSite = params?.isB2BSite ?? false;
  const wineLocale: WineLocale = params?.locale ?? "sv";
  const sqlLimit = isB2BSite ? Math.max(limit, 5000) : limit;
  const { displayCurrencyCode, sekToDisplayRate } =
    await resolveProductDisplayCurrency(params);

  if (collectionId === "wine-boxes-collection") {
    const calculations = await getAllWineBoxCalculations();
    if (calculations.length === 0) return [];

    const q = params?.searchQuery?.trim().toLowerCase();
    let calcs = calculations;
    if (q) {
      calcs = calculations.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)),
      );
    }

    return calcs.slice(0, limit).map((calc) => {
      const hasBoxDiscount = calc.discountPercentage > 0;
      return {
        id: calc.wineBoxId,
        title: calc.name,
        description: calc.description,
        descriptionHtml: "",
        handle: `wine-box-${calc.wineBoxId}`,
        productType: "wine-box",
        categoryId: "wine-boxes-collection",
        producerId: "",
        producerName: "",
        options: [
          { id: "size", name: "Size", values: [`${calc.bottleCount} Bottles`] },
          ...(hasBoxDiscount
            ? [
                {
                  id: "discount",
                  name: "Discount",
                  values: [`${Math.round(calc.discountPercentage)}% off`],
                },
              ]
            : []),
        ],
        variants: [
          {
            id: `${calc.wineBoxId}-variant`,
            title: `${calc.bottleCount} Bottles`,
            availableForSale: true,
            price: displayPriceFromSek(
              calc.finalPrice,
              displayCurrencyCode,
              sekToDisplayRate,
              "round",
            ),
            selectedOptions: [
              { name: "Size", value: `${calc.bottleCount} Bottles` },
              ...(hasBoxDiscount
                ? [
                    {
                      name: "Discount",
                      value: `${Math.round(calc.discountPercentage)}% off`,
                    },
                  ]
                : []),
            ],
          },
        ],
        priceRange: {
          minVariantPrice: displayPriceFromSek(
            calc.finalPrice,
            displayCurrencyCode,
            sekToDisplayRate,
            "round",
          ),
          maxVariantPrice: displayPriceFromSek(
            calc.finalPrice,
            displayCurrencyCode,
            sekToDisplayRate,
            "round",
          ),
        },
        priceBreakdown: {
          basePriceCents: calc.totalCents,
        },
        featuredImage: {
          id: `${calc.wineBoxId}-img`,
          url: calc.imageUrl || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
          altText: calc.name,
        },
        images: [
          {
            id: `${calc.wineBoxId}-img`,
            url: calc.imageUrl || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=600&fit=crop",
            altText: calc.name,
          },
        ],
        seo: {
          title: buildWineBoxSeoTitle(calc.name, "sv"),
          description: buildWineBoxSeoDescription("sv", calc.description),
        },
        tags: [
          `${calc.bottleCount}-bottles`,
          ...(hasBoxDiscount ? [`${calc.discountPercentage}-discount`] : []),
        ],
        availableForSale: true,
        currencyCode: displayCurrencyCode,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    }) as ProductData[];
  }

  const sb = getSupabaseAdmin();

  // When collection is a producer, only show wines if producer is live
  const producerCheck = await sb
    .from("producers")
    .select("id, is_live")
    .eq("id", collectionId)
    .maybeSingle();
  if (producerCheck.error && /is_live|column.*does not exist/i.test(producerCheck.error.message ?? "")) {
    // is_live column not yet migrated; continue
  } else if (producerCheck.data && (producerCheck.data as any).is_live === false) {
    return [];
  } else if (producerCheck.data === null && /^[0-9a-f-]{36}$/i.test(collectionId)) {
    return [];
  }

  const collSelect = `
      id,
      wine_name,
      vintage,
      grape_varieties,
      color,
      handle,
      base_price_cents,
      cost_amount,
      cost_currency,
      exchange_rate,
      alcohol_tax_cents,
      b2b_margin_percentage,
      b2b_stock,
      label_image_path,
      producer_id,
      description,
      farming,
      region,
      available_for_sale,
      source_type,
      producers(name, display_name, boost_active, ${PRODUCER_ORGANIC_VERIFY_SELECT})
    `;
  let collQuery = applyWineCollectionSearch(
    sb
      .from("wines")
      .select(collSelect)
      .eq("is_live", true)
      .eq("producer_id", collectionId),
    params?.searchQuery,
  );
  let collResult = await collQuery.limit(sqlLimit);

  if (collResult.error) {
    const msg = collResult.error.message ?? "";
    if (
      /certification_verified_url|certification_in_conversion|column.*does not exist|could not find.*column/i.test(
        msg,
      )
    ) {
      const collSelectWithoutVerify = collSelect.replace(
        `, ${PRODUCER_ORGANIC_VERIFY_SELECT}`,
        "",
      );
      collQuery = applyWineCollectionSearch(
        sb
          .from("wines")
          .select(collSelectWithoutVerify)
          .eq("is_live", true)
          .eq("producer_id", collectionId),
        params?.searchQuery,
      );
      collResult = await collQuery.limit(sqlLimit);
    }
    if (collResult.error) {
      const msg2 = collResult.error.message ?? "";
      if (/is_live|column.*does not exist/i.test(msg2)) {
        const collSelectWithoutVerify = collSelect.replace(
          `, ${PRODUCER_ORGANIC_VERIFY_SELECT}`,
          "",
        );
        collQuery = applyWineCollectionSearch(
          sb
            .from("wines")
            .select(collSelectWithoutVerify)
            .eq("producer_id", collectionId),
          params?.searchQuery,
        );
        collResult = await collQuery.limit(sqlLimit);
      }
    }
    if (collResult.error) {
      throw new Error(supabaseErrorToMessage(collResult.error));
    }
  }

  const collData = collResult.data ?? [];
  const collCurrencies = [
    ...new Set(
      collData
        .map((w: any) => w.cost_currency || "EUR")
        .filter((c: string) => c),
    ),
  ] as string[];
  const collRateMap = await fetchExchangeRatesMap(collCurrencies);

  const { data: producerData } = await sb
    .from("producers")
    .select("name, display_name, boost_active")
    .eq("id", collectionId)
    .single();

  const producerName = producerData?.name;
  const collectionProducerBoostActive =
    (producerData as { boost_active?: boolean } | null)?.boost_active === true;

  const collWineIds = collData.map((w: any) => w.id) || [];
  const { stockMap: collB2bStockMap, shippingMap: collB2bShippingMap } =
    await fetchB2BStockAndShippingFromPallets(sb, collWineIds);

  const collSellableStock = new Map<string, number | null>();
  if (isB2BSite) {
    for (const wine of collData) {
      const wineId = typeof wine?.id === "string" ? wine.id : "";
      if (!wineId) continue;
      const fromPallets = collB2bStockMap.get(wineId);
      collSellableStock.set(
        wineId,
        fromPallets != null
          ? fromPallets
          : wine.b2b_stock != null
            ? Number(wine.b2b_stock)
            : null,
      );
    }
  }
  const collAvailability = isB2BSite
    ? await fetchB2BWineAvailability(sb, collWineIds, collSellableStock)
    : new Map<string, B2BWineAvailability>();
  const collIsNewWineIds = isB2BSite
    ? await fetchB2BWineIsNew(sb, collWineIds)
    : new Set<string>();

  const collectionProducts = collData.map((i: any) => {
    const grapeVarieties = Array.isArray(i.grape_varieties)
      ? i.grape_varieties
      : i.grape_varieties
        ? i.grape_varieties.split(",").map((g: string) => g.trim())
        : [];
    const colorName = i.color;
    const b2bStockFromPallets = collB2bStockMap.get(i.id);
    const b2bStock =
      b2bStockFromPallets != null
        ? b2bStockFromPallets
        : i.b2b_stock != null
          ? Number(i.b2b_stock)
          : null;
    const availableForSale = resolveProductAvailableForSale({
      isB2BSite,
      b2bStock,
      availableForSale: i.available_for_sale,
    });
    const b2bAvailability = isB2BSite
      ? (collAvailability.get(i.id) ?? "hidden")
      : undefined;
    const b2bIsNew = isB2BSite ? collIsNewWineIds.has(i.id) : undefined;

    const rawDesc = extractWineText(
      i.description as Record<string, string> | string | null,
      wineLocale,
      wineLocale === "en" ? { fallback: false } : undefined,
    );

    return {
      id: i.id,
      title: wineDisplayTitle(i.wine_name, i.vintage),
      description: rawDesc || "",
      descriptionHtml: rawDesc ? `<p>${rawDesc}</p>` : "",
      handle: i.handle,
      productType: "wine",
      categoryId: i.producer_id,
      producerId: i.producer_id,
      producerName: producerName || i.producers?.name || `Producer ${collectionId.substring(0, 8)}`,
      producerDisplayName:
        rawProducerDisplayName(producerData) ?? rawProducerDisplayName(i.producers),
      sourceType:
        typeof i.source_type === "string" && i.source_type.trim()
          ? i.source_type.trim()
          : null,
      producerBoostActive:
        collectionProducerBoostActive ||
        (i.producers as { boost_active?: boolean } | null)?.boost_active === true,
      ...producerOrganicVerificationFields(i.producers),
      options: [
        {
          id: "grape-varieties",
          name: "Grape Varieties",
          values: grapeVarieties.map((v: string) => ({
            id: v.toLowerCase().replace(/\s+/g, "-"),
            name: v,
          })),
        },
        {
          id: "color",
          name: "Color",
          values: colorName
            ? [{ id: colorName.toLowerCase().replace(/\s+/g, "-"), name: colorName }]
            : [],
        },
      ],
      variants: [
        {
          id: `${i.id}-default`,
          title: "750 ml",
          availableForSale,
          price: displayPriceFromSek(
            i.base_price_cents / 100,
            displayCurrencyCode,
            sekToDisplayRate,
          ),
          selectedOptions: [
            ...grapeVarieties.map((g: string) => ({ name: "Grape Varieties", value: g })),
            ...(colorName ? [{ name: "Color", value: colorName }] : []),
          ],
        },
      ],
      priceRange: {
        minVariantPrice: displayPriceFromSek(
          i.base_price_cents / 100,
          displayCurrencyCode,
          sekToDisplayRate,
        ),
        maxVariantPrice: displayPriceFromSek(
          i.base_price_cents / 100,
          displayCurrencyCode,
          sekToDisplayRate,
        ),
      },
      featuredImage: {
        id: `${i.id}-img`,
        url: convertToFullUrl(i.label_image_path),
        altText: i.wine_name,
        width: 600,
        height: 600,
      },
      images: [
        {
          id: `${i.id}-img`,
          url: convertToFullUrl(i.label_image_path),
          altText: i.wine_name,
          width: 600,
          height: 600,
        },
      ],
      seo: { title: i.wine_name, description: "" },
      tags: [...grapeVarieties, ...(colorName ? [colorName] : [])],
      farming: (i.farming as string | null | undefined) ?? null,
      region: (i.region as string | null | undefined) ?? null,
      availableForSale,
      currencyCode: displayCurrencyCode,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      b2bStock: b2bStock ?? undefined,
      b2bAvailability,
      b2bIsNew,
      ...(i.b2b_margin_percentage != null &&
      i.b2b_margin_percentage >= 0 &&
      i.b2b_margin_percentage < 100
        ? {
            b2bPriceExclVat: calculateRoundedB2BPriceExclVat(
              i.cost_amount || 0,
              collRateMap[(i.cost_currency || "EUR") as string] ??
                i.exchange_rate ??
                1,
              resolveWineAlcoholTaxCents(i.alcohol_tax_cents),
              i.b2b_margin_percentage,
              collB2bShippingMap.get(i.id) ?? 0,
            ),
          }
        : {}),
    };
  });

  const visibleCollection = isB2BSite
    ? collectionProducts.filter((product) => product.b2bAvailability !== "hidden")
    : collectionProducts;
  return visibleCollection.slice(0, limit);
}

/**
 * True when at least one live catalog wine matches the shop category filters.
 * GitHub Actions builds with NEXT_PUBLIC_SUPABASE_URL pointed at
 * placeholder.supabase.co. Sitemap generation calls this during `next build`,
 * and that host does not resolve. Skip the query there so CI can finish.
 * Production builds use the real host and still query.
 */
export async function catalogHasProducts(filters?: {
  filterColor?: string[];
  filterTags?: string[];
  filterIsNatural?: boolean;
  filterFarming?: string[];
  filterGrape?: string;
  filterCountryCode?: string;
  filterRegion?: string;
  filterWineRegion?: string;
  isB2BSite?: boolean;
}): Promise<boolean> {
  if (supabaseBuildUsesPlaceholder()) return false;
  const rows = await fetchProductsData({
    ...filters,
    limit: 1,
    isB2BSite: filters?.isB2BSite ?? false,
  });
  return rows.length > 0;
}
