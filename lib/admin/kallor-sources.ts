/**
 * Load packing sources that currently have at least one live wine.
 * Producers: wines.is_live + producers row (excl. test producer).
 * Wholesalers: wines.source_type wholesaler/wholesale + source_name, joined to wholesaler_sources.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isExcludedKallorProducerName } from "@/lib/admin/kallor-excluded-producers";
import {
  normalizeWholesalerSourceKey,
  wholesalerSourceKeyFromName,
} from "@/lib/admin/wholesaler-source-key";
import { formatProducerSenderAddress } from "@/lib/admin/direct-box-pickup-addresses";

export type KallorSourceKind = "producer" | "wholesaler";

export type KallorSourceRow = {
  kind: KallorSourceKind;
  sourceKey: string;
  name: string;
  contactEmail: string | null;
  addressStreet: string | null;
  addressPostcode: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  /** Formatted one-line address for display. */
  addressDisplay: string;
  contactLocale: string;
  emailMissing: boolean;
  addressMissing: boolean;
  liveWineCount: number;
  /** Producer UUID when kind=producer; null for wholesaler. */
  producerId: string | null;
  /** True when wholesaler_sources row exists (always true for producers). */
  recordExists: boolean;
};

type LiveWineRow = {
  id: string;
  producer_id: string | null;
  source_type: string | null;
  source_name: string | null;
  producers:
    | {
        id: string;
        name: string | null;
        contact_email: string | null;
        contact_locale: string | null;
        address_street: string | null;
        address_postcode: string | null;
        address_city: string | null;
        country_code: string | null;
        country: string | null;
      }
    | {
        id: string;
        name: string | null;
        contact_email: string | null;
        contact_locale: string | null;
        address_street: string | null;
        address_postcode: string | null;
        address_city: string | null;
        country_code: string | null;
        country: string | null;
      }[]
    | null;
};

type WholesalerRow = {
  source_key: string;
  name: string;
  contact_email: string | null;
  address_street: string | null;
  address_postcode: string | null;
  address_city: string | null;
  address_country: string | null;
  contact_locale: string | null;
};

function oneProducer(
  p: LiveWineRow["producers"],
): NonNullable<Exclude<LiveWineRow["producers"], unknown[] | null>> | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

function isWholesalerType(sourceType: string | null | undefined): boolean {
  const t = String(sourceType ?? "")
    .trim()
    .toLowerCase();
  return t === "wholesaler" || t === "wholesale";
}

function formatAddressLine(parts: {
  street: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
}): { display: string; missing: boolean } {
  const street = String(parts.street ?? "").trim();
  const postcode = String(parts.postcode ?? "").trim();
  const city = String(parts.city ?? "").trim();
  const country = String(parts.country ?? "").trim();
  const line = [
    street,
    [postcode, city].filter(Boolean).join(" "),
    country,
  ]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
  return { display: line, missing: !line };
}

export async function listKallorSources(
  sb: SupabaseClient,
): Promise<KallorSourceRow[]> {
  const { data: wines, error: wineErr } = await sb
    .from("wines")
    .select(
      `
      id,
      producer_id,
      source_type,
      source_name,
      producers (
        id,
        name,
        contact_email,
        contact_locale,
        address_street,
        address_postcode,
        address_city,
        country_code,
        country
      )
    `,
    )
    .eq("is_live", true);

  if (wineErr) throw new Error(wineErr.message);

  const liveWines = (wines ?? []) as LiveWineRow[];

  const producerCounts = new Map<string, number>();
  const producerMeta = new Map<
    string,
    NonNullable<ReturnType<typeof oneProducer>>
  >();
  const wholesalerCounts = new Map<string, { count: number; displayName: string }>();

  for (const wine of liveWines) {
    if (isWholesalerType(wine.source_type)) {
      const key = wholesalerSourceKeyFromName(wine.source_name);
      const displayName =
        String(wine.source_name ?? "").trim() ||
        key.replace(/^wholesaler:/i, "") ||
        "Grossist";
      const prev = wholesalerCounts.get(key);
      if (prev) prev.count += 1;
      else wholesalerCounts.set(key, { count: 1, displayName });
      continue;
    }

    const producer = oneProducer(wine.producers);
    const producerId = String(
      producer?.id ?? wine.producer_id ?? "",
    ).trim();
    if (!producerId || !producer) continue;
    if (isExcludedKallorProducerName(producer.name)) continue;
    producerCounts.set(producerId, (producerCounts.get(producerId) ?? 0) + 1);
    if (!producerMeta.has(producerId)) producerMeta.set(producerId, producer);
  }

  const wholesalerKeys = [...wholesalerCounts.keys()];
  const wholesalerByKey = new Map<string, WholesalerRow>();
  if (wholesalerKeys.length > 0) {
    const { data: rows, error: wsErr } = await sb
      .from("wholesaler_sources")
      .select(
        "source_key, name, contact_email, address_street, address_postcode, address_city, address_country, contact_locale",
      )
      .in("source_key", wholesalerKeys);
    if (wsErr) throw new Error(wsErr.message);
    for (const row of (rows ?? []) as WholesalerRow[]) {
      wholesalerByKey.set(normalizeWholesalerSourceKey(row.source_key), row);
    }
  }

  const out: KallorSourceRow[] = [];

  for (const [producerId, count] of producerCounts) {
    const p = producerMeta.get(producerId);
    if (!p) continue;
    const email = String(p.contact_email ?? "").trim() || null;
    const street = String(p.address_street ?? "").trim() || null;
    const postcode = String(p.address_postcode ?? "").trim() || null;
    const city = String(p.address_city ?? "").trim() || null;
    const country =
      String(p.country_code ?? "").trim() ||
      String(p.country ?? "").trim() ||
      null;
    const formatted = formatProducerSenderAddress({
      address_street: street,
      address_postcode: postcode,
      address_city: city,
    });
    const addressMissing =
      formatted === "Adress saknas" || (!street && !postcode && !city);
    const addressDisplay = addressMissing
      ? ""
      : country
        ? `${formatted}, ${country}`
        : formatted;

    out.push({
      kind: "producer",
      sourceKey: `producer:${producerId}`,
      name: String(p.name ?? "").trim() || "Producent",
      contactEmail: email,
      addressStreet: street,
      addressPostcode: postcode,
      addressCity: city,
      addressCountry: country,
      addressDisplay,
      contactLocale: String(p.contact_locale ?? "fr").trim() || "fr",
      emailMissing: !email,
      addressMissing,
      liveWineCount: count,
      producerId,
      recordExists: true,
    });
  }

  for (const [key, meta] of wholesalerCounts) {
    const row = wholesalerByKey.get(key);
    const email = String(row?.contact_email ?? "").trim() || null;
    const street = String(row?.address_street ?? "").trim() || null;
    const postcode = String(row?.address_postcode ?? "").trim() || null;
    const city = String(row?.address_city ?? "").trim() || null;
    const country = String(row?.address_country ?? "").trim() || null;
    const { display, missing } = formatAddressLine({
      street,
      postcode,
      city,
      country,
    });

    out.push({
      kind: "wholesaler",
      sourceKey: key,
      name: String(row?.name ?? meta.displayName).trim() || meta.displayName,
      contactEmail: email,
      addressStreet: street,
      addressPostcode: postcode,
      addressCity: city,
      addressCountry: country,
      addressDisplay: display,
      contactLocale: String(row?.contact_locale ?? "fr").trim() || "fr",
      emailMissing: !email,
      addressMissing: missing,
      liveWineCount: meta.count,
      producerId: null,
      recordExists: Boolean(row),
    });
  }

  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "producer" ? -1 : 1;
    return a.name.localeCompare(b.name, "sv");
  });

  return out;
}
