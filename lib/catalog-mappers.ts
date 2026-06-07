import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isCatalogCertification,
  isCatalogWineColor,
  isCatalogWineType,
  normalizeCatalogWineColor,
  type CatalogWineType,
} from "@/lib/catalog-types";
import {
  buildWineArrayJsonb,
  buildWineJsonb,
  extractWineArray,
  extractWineText,
  type WineLocale,
} from "@/lib/i18n/wine-locale";

/** DB columns loaded for producer → API mapping. */
export const PRODUCER_DB_SELECT =
  "id, name, region, subregion, country_code, founded_year, short_description, bio_long, certification, contact_name, contact_email, status, created_at";

/** DB columns loaded for wine → API mapping. */
export const WINE_DB_SELECT =
  "id, producer_id, wine_name, vintage, appellation, region, grape_varieties, color, base_price_cents, volume_liters, summary, description, tasting_notes, alcohol_percentage, abv, farming, additives, serving_temp_c, food_pairing, awards, cost_amount, cost_currency, winemaker_notes, elevation_masl, soil_type, ageing, yield_hl_ha, is_live, created_at, updated_at";

export type ProducerApiRow = {
  id: string;
  name: string;
  region: string;
  subregion: string | null;
  country: string;
  founded_year: number | null;
  bio_short: string | null;
  bio_long: string | null;
  certification: string | null;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string | null;
};

export type WineApiRow = {
  id: string;
  producer_id: string;
  name: string;
  vintage: string | null;
  appellation: string | null;
  region: string | null;
  grape_varieties: string | null;
  /** Same as `color` — wine type shown on PDP specs. */
  type: string | null;
  color: string | null;
  price_sek: number;
  bottle_size_ml: number;
  /** Short hero text on PDP white box. */
  summary: string | null;
  /** Fallback hero text when summary is empty. */
  description: string | null;
  tasting_notes: string | null;
  alcohol_pct: number | null;
  /** ABV text on PDP (e.g. "13.5 %"); falls back to alcohol_pct. */
  abv: string | null;
  farming: string | null;
  /** Shown with farming on PDP specs (Odling & tillsatser). */
  additives: string | null;
  serving_temp_c: string | null;
  food_pairing: string[] | null;
  awards: string[] | null;
  import_price_eur: number | null;
  winemaker_notes: string | null;
  elevation_masl: number | null;
  soil_type: string | null;
  ageing: string | null;
  yield_hl_ha: number | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type ProducerDbRow = Record<string, unknown>;
type WineDbRow = Record<string, unknown>;

export function producerRowToApi(row: ProducerDbRow): ProducerApiRow {
  return {
    id: row.id as string,
    name: row.name as string,
    region: row.region as string,
    subregion: (row.subregion as string | null) ?? null,
    country: (row.country_code as string) ?? "",
    founded_year: (row.founded_year as number | null) ?? null,
    bio_short: (row.short_description as string | null) ?? null,
    bio_long: (row.bio_long as string | null) ?? null,
    certification: (row.certification as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  };
}

function parseAlcoholPct(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function wineRowToApi(
  row: Record<string, unknown>,
  locale: WineLocale = "sv",
): WineApiRow {
  const basePriceCents = row.base_price_cents as number | null;
  const volumeLiters = row.volume_liters as number | null;
  const costCurrency = row.cost_currency as string | null;
  const costAmount = row.cost_amount as number | null;

  return {
    id: row.id as string,
    producer_id: row.producer_id as string,
    name: row.wine_name as string,
    vintage: (row.vintage as string | null) ?? null,
    appellation: (row.appellation as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    grape_varieties: (row.grape_varieties as string | null) ?? null,
    type: (row.color as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    price_sek:
      basePriceCents != null ? Math.round(basePriceCents / 100) : 0,
    bottle_size_ml:
      volumeLiters != null ? Math.round(volumeLiters * 1000) : 750,
    summary: extractWineText(
      row.summary as Record<string, string> | string | null,
      locale,
    ),
    description: extractWineText(
      row.description as Record<string, string> | string | null,
      locale,
    ),
    tasting_notes: extractWineText(
      row.tasting_notes as Record<string, string> | string | null,
      locale,
    ),
    alcohol_pct: parseAlcoholPct(row.alcohol_percentage),
    abv: (row.abv as string | null) ?? null,
    farming: (row.farming as string | null) ?? null,
    additives: extractWineText(
      row.additives as Record<string, string> | string | null,
      locale,
    ),
    serving_temp_c: (row.serving_temp_c as string | null) ?? null,
    food_pairing: extractWineArray(
      row.food_pairing as Record<string, string[]> | string[] | null,
      locale,
    ),
    awards: extractWineArray(
      row.awards as Record<string, string[]> | string[] | null,
      locale,
    ),
    import_price_eur:
      costCurrency === "EUR" && costAmount != null ? Number(costAmount) : null,
    winemaker_notes: extractWineText(
      row.winemaker_notes as Record<string, string> | string | null,
      locale,
    ),
    elevation_masl: (row.elevation_masl as number | null) ?? null,
    soil_type: extractWineText(
      row.soil_type as Record<string, string> | string | null,
      locale,
    ),
    ageing: extractWineText(
      row.ageing as Record<string, string> | string | null,
      locale,
    ),
    yield_hl_ha:
      row.yield_hl_ha != null ? Number(row.yield_hl_ha) : null,
    is_published: row.is_live === true,
    created_at: (row.created_at as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

export function buildProducerPatch(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.region === "string") patch.region = body.region.trim();
  if (typeof body.country === "string") patch.country_code = body.country.trim();
  if (body.subregion === null) patch.subregion = null;
  else if (typeof body.subregion === "string") {
    patch.subregion = body.subregion.trim() || null;
  }
  if (body.founded_year === null) patch.founded_year = null;
  else if (
    typeof body.founded_year === "number" &&
    Number.isInteger(body.founded_year)
  ) {
    patch.founded_year = body.founded_year;
  }
  if (body.bio_short === null) patch.short_description = null;
  else if (typeof body.bio_short === "string") {
    patch.short_description = body.bio_short;
  }
  if (body.bio_long === null) patch.bio_long = null;
  else if (typeof body.bio_long === "string") patch.bio_long = body.bio_long;
  if (body.certification === null) patch.certification = null;
  else if (isCatalogCertification(body.certification)) {
    patch.certification = body.certification;
  }
  if (body.contact_name === null) patch.contact_name = null;
  else if (typeof body.contact_name === "string") {
    patch.contact_name = body.contact_name.trim() || null;
  }
  if (body.contact_email === null) patch.contact_email = null;
  else if (typeof body.contact_email === "string") {
    patch.contact_email = body.contact_email.trim() || null;
  }

  return patch;
}

export function buildProducerInsert(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const region = typeof body.region === "string" ? body.region.trim() : "";
  const country =
    typeof body.country === "string" && body.country.trim()
      ? body.country.trim()
      : "France";
  const bioShort =
    typeof body.bio_short === "string" ? body.bio_short : "";

  const row: Record<string, unknown> = {
    name,
    region,
    country_code: country,
    short_description: bioShort,
    address_street: "",
    address_postcode: "",
    address_city: "",
    lat: 0,
    lon: 0,
    logo_image_path: "",
    status: "active",
  };

  const patch = buildProducerPatch(body);
  return { ...row, ...patch };
}

function vintageToDb(value: unknown): string {
  if (value === null || value === undefined) return "NV";
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "NV";
}

function grapeVarietiesToDb(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.filter((g): g is string => typeof g === "string");
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

function generateWineHandle(wineName: string, vintage: string): string {
  const slug = wineName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const v = vintage.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "nv";
  return `${slug || "wine"}-${v}`;
}

export function buildWinePatch(
  body: Record<string, unknown>,
  locale: WineLocale = "sv",
  existingRow?: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (typeof body.producer_id === "string") {
    patch.producer_id = body.producer_id.trim();
  }
  if (typeof body.name === "string") patch.wine_name = body.name.trim();
  if (body.vintage === null) patch.vintage = "NV";
  else if (
    typeof body.vintage === "number" ||
    typeof body.vintage === "string"
  ) {
    patch.vintage = vintageToDb(body.vintage);
  }
  if (typeof body.appellation === "string") {
    patch.appellation = body.appellation.trim();
  }
  if (typeof body.region === "string") {
    patch.region = body.region.trim() || null;
  }
  if (body.grape_varieties !== undefined) {
    patch.grape_varieties = grapeVarietiesToDb(body.grape_varieties);
  }
  if (body.color === null) patch.color = null;
  else if (typeof body.color === "string" && isCatalogWineColor(body.color)) {
    patch.color = normalizeCatalogWineColor(body.color);
  } else if (isCatalogWineType(body.type)) {
    patch.color = normalizeCatalogWineColor(body.type);
  }
  if (body.summary !== undefined) {
    patch.summary = buildWineJsonb(
      body.summary as string | null,
      locale,
      existingRow?.summary as Record<string, string> | string | null,
    );
  }
  if (body.description !== undefined) {
    patch.description = buildWineJsonb(
      body.description as string | null,
      locale,
      existingRow?.description as Record<string, string> | string | null,
    );
  }
  if (typeof body.price_sek === "number" && Number.isInteger(body.price_sek)) {
    patch.base_price_cents = body.price_sek * 100;
  }
  if (
    typeof body.bottle_size_ml === "number" &&
    Number.isInteger(body.bottle_size_ml)
  ) {
    patch.volume_liters = body.bottle_size_ml / 1000.0;
  }
  if (body.tasting_notes !== undefined) {
    patch.tasting_notes = buildWineJsonb(
      body.tasting_notes as string | null,
      locale,
      existingRow?.tasting_notes as Record<string, string> | string | null,
    );
  }
  if (body.alcohol_pct === null) patch.alcohol_percentage = null;
  else if (typeof body.alcohol_pct === "number") {
    patch.alcohol_percentage = String(body.alcohol_pct);
  }
  if (body.abv === null) patch.abv = null;
  else if (typeof body.abv === "string") patch.abv = body.abv.trim() || null;
  if (body.farming === null) patch.farming = null;
  else if (isCatalogCertification(body.farming)) patch.farming = body.farming;
  if (body.additives !== undefined) {
    patch.additives = buildWineJsonb(
      body.additives as string | null,
      locale,
      existingRow?.additives as Record<string, string> | string | null,
    );
  }
  if (body.serving_temp_c === null) patch.serving_temp_c = null;
  else if (typeof body.serving_temp_c === "string") {
    patch.serving_temp_c = body.serving_temp_c;
  }
  if (body.food_pairing !== undefined && Array.isArray(body.food_pairing)) {
    patch.food_pairing = buildWineArrayJsonb(
      body.food_pairing.filter((x): x is string => typeof x === "string"),
      locale,
      existingRow?.food_pairing as Record<string, string[]> | string[] | null,
    );
  }
  if (body.awards !== undefined && Array.isArray(body.awards)) {
    patch.awards = buildWineArrayJsonb(
      body.awards.filter((x): x is string => typeof x === "string"),
      locale,
      existingRow?.awards as Record<string, string[]> | string[] | null,
    );
  }
  if (body.import_price_eur === null) {
    patch.cost_amount = null;
  } else if (typeof body.import_price_eur === "number") {
    patch.cost_amount = body.import_price_eur;
    patch.cost_currency = "EUR";
  }
  if (body.winemaker_notes !== undefined) {
    patch.winemaker_notes = buildWineJsonb(
      body.winemaker_notes as string | null,
      locale,
      existingRow?.winemaker_notes as Record<string, string> | string | null,
    );
  }
  if (body.elevation_masl === null) patch.elevation_masl = null;
  else if (
    typeof body.elevation_masl === "number" &&
    Number.isInteger(body.elevation_masl)
  ) {
    patch.elevation_masl = body.elevation_masl;
  }
  if (body.yield_hl_ha === null) patch.yield_hl_ha = null;
  else if (typeof body.yield_hl_ha === "number") {
    patch.yield_hl_ha = body.yield_hl_ha;
  }
  if (body.soil_type !== undefined) {
    patch.soil_type = buildWineJsonb(
      body.soil_type as string | null,
      locale,
      existingRow?.soil_type as Record<string, string> | string | null,
    );
  }
  if (body.ageing !== undefined) {
    patch.ageing = buildWineJsonb(
      body.ageing as string | null,
      locale,
      existingRow?.ageing as Record<string, string> | string | null,
    );
  }
  if (typeof body.is_published === "boolean") patch.is_live = body.is_published;

  return patch;
}

export function buildWineInsert(body: Record<string, unknown>): Record<string, unknown> {
  const producerId =
    typeof body.producer_id === "string" ? body.producer_id.trim() : "";
  const wineName = typeof body.name === "string" ? body.name.trim() : "";
  const appellation =
    typeof body.appellation === "string" ? body.appellation.trim() : "";
  const type = body.type as CatalogWineType;
  const priceSek = body.price_sek as number;
  const vintage = vintageToDb(body.vintage ?? null);
  const colorInput =
    typeof body.color === "string" && isCatalogWineColor(body.color)
      ? body.color
      : type;
  const bottleSizeMl =
    typeof body.bottle_size_ml === "number" &&
    Number.isInteger(body.bottle_size_ml)
      ? body.bottle_size_ml
      : 750;

  const row: Record<string, unknown> = {
    producer_id: producerId,
    wine_name: wineName,
    handle: generateWineHandle(wineName, vintage),
    vintage,
    appellation,
    color: normalizeCatalogWineColor(colorInput),
    base_price_cents: priceSek * 100,
    volume_liters: bottleSizeMl / 1000.0,
    is_live: body.is_published === true,
    label_image_path: "",
  };

  const patch = buildWinePatch(body);
  delete patch.producer_id;
  delete patch.wine_name;
  delete patch.vintage;
  delete patch.appellation;
  delete patch.color;
  delete patch.base_price_cents;
  delete patch.volume_liters;
  delete patch.is_live;

  return { ...row, ...patch };
}

export async function ensureUniqueWineHandle(
  sb: SupabaseClient,
  baseHandle: string,
): Promise<string> {
  let handle = baseHandle;
  for (let n = 2; ; n++) {
    const { data: existing } = await sb
      .from("wines")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();
    if (!existing) return handle;
    handle = `${baseHandle}-${n}`;
  }
}
