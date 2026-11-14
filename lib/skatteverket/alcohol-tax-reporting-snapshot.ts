/**
 * Build and persist frozen Skatteverket alcohol-tax reporting lines.
 * Written once at charge/close with service_role; never recomputed.
 *
 * Tax amounts always go through computeSwedishWineAlcoholTaxSek on the
 * line's TOTAL litres (quantity × bottle volume), rounded once — shared by
 * pallet_close, direct_box_confirm, and legacy_auto_charge.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  computeSwedishWineAlcoholTaxSek,
  parseWineAbvPercent,
  wineIndicatesFortifiedOrMellanklass,
} from "@/lib/skatteverket/wine-alcohol-tax";

export type AlcoholTaxSnapshotTrigger =
  | "pallet_close"
  | "direct_box_confirm"
  | "legacy_auto_charge";

export type AlcoholTaxReportingLineInput = {
  reservationId: string;
  orderReservationItemId: string;
  buyerFullName: string | null;
  buyerDateOfBirth: string | null;
  deliveryStreet: string | null;
  deliveryPostalCode: string | null;
  deliveryCity: string | null;
  deliveryCountry: string | null;
  wineId: string | null;
  productName: string;
  quantity: number;
  bottleVolumeLiters: number;
  alcoholPercentage: number | null;
  alcoholTaxSek: number | null;
  needsReview: boolean;
  /**
   * Reserved for a future explicit Skatteverket product class
   * (e.g. still wine vs mellanklass). Always null until we have a
   * trusted product-type field — never invent fortified rates.
   */
  productTaxCategory: string | null;
  /**
   * Small-producer reduction % (SFS 2026:738 3 a §). Always null for now;
   * requires a producer certificate before use. Full tax is stored.
   */
  smallProducerReductionPct: number | null;
  snappedAt: string;
  triggerSource: AlcoholTaxSnapshotTrigger;
};

export type BuildAlcoholTaxSnapshotResult = {
  lines: AlcoholTaxReportingLineInput[];
  needsReviewCount: number;
};

const DEFAULT_BOTTLE_LITERS = 0.75;

type ReservationRow = {
  id: string;
  age_verified_dob: string | null;
  address_id: string | null;
};

type AddressRow = {
  full_name: string | null;
  address_street: string | null;
  address_postcode: string | null;
  address_city: string | null;
  country_code: string | null;
};

type ItemWineRow = {
  id: string;
  item_id: string | null;
  quantity: number | null;
  wines: {
    id: string;
    wine_name: string | null;
    vintage: string | number | null;
    volume_liters: number | string | null;
    alcohol_percentage: string | number | null;
    abv: string | null;
    color: string | null;
    classification: string | null;
    tags: string | string[] | null;
    additives: string | null;
  } | null;
};

/** Pure builder — no I/O. Used by unit tests and the persist helper. */
export function buildAlcoholTaxReportingLines(opts: {
  reservationId: string;
  buyer: {
    fullName: string | null;
    dateOfBirth: string | null;
    street: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
  };
  items: Array<{
    orderReservationItemId: string;
    wineId: string | null;
    wineName: string | null;
    vintage: string | number | null;
    quantity: number;
    volumeLiters: number | null;
    abv: string | null;
    alcoholPercentage: string | number | null;
    color?: string | null;
    classification?: string | null;
    tags?: string | string[] | null;
    additives?: string | null;
  }>;
  snappedAt: string;
  triggerSource: AlcoholTaxSnapshotTrigger;
}): BuildAlcoholTaxSnapshotResult {
  const lines: AlcoholTaxReportingLineInput[] = [];
  let needsReviewCount = 0;

  for (const item of opts.items) {
    const qty = Math.floor(Number(item.quantity) || 0);
    if (qty <= 0) continue;

    const bottleLiters =
      item.volumeLiters != null &&
      Number.isFinite(Number(item.volumeLiters)) &&
      Number(item.volumeLiters) > 0
        ? Number(item.volumeLiters)
        : DEFAULT_BOTTLE_LITERS;

    // Total litres for the line — tax is computed on this total, rounded once.
    const volumeLiters = bottleLiters * qty;
    const abvPercent = parseWineAbvPercent(item.abv, item.alcoholPercentage);
    const fortifiedOrMellanklass = wineIndicatesFortifiedOrMellanklass({
      wineName: item.wineName,
      color: item.color,
      classification: item.classification,
      tags: item.tags,
      additives: item.additives,
    });

    // TODO: Without an explicit product_tax_category we assume still wine
    // bands when no fortified/mellanklass marker is present. Do NOT apply
    // mellanklass 37,34 kr/l — flag for review instead when indicated.
    const taxSek =
      fortifiedOrMellanklass || abvPercent == null
        ? null
        : computeSwedishWineAlcoholTaxSek({
            abvPercent,
            volumeLiters,
          });

    // Missing ABV, out-of-band ABV, or fortified/mellanklass → review; never guess.
    const needsReview =
      fortifiedOrMellanklass || abvPercent == null || taxSek == null;
    if (needsReview) needsReviewCount += 1;

    const productName = formatProductName(item.wineName, item.vintage);

    lines.push({
      reservationId: opts.reservationId,
      orderReservationItemId: item.orderReservationItemId,
      buyerFullName: trimOrNull(opts.buyer.fullName),
      buyerDateOfBirth: trimOrNull(opts.buyer.dateOfBirth),
      deliveryStreet: trimOrNull(opts.buyer.street),
      deliveryPostalCode: trimOrNull(opts.buyer.postalCode),
      deliveryCity: trimOrNull(opts.buyer.city),
      deliveryCountry: trimOrNull(opts.buyer.country),
      wineId: item.wineId,
      productName,
      quantity: qty,
      bottleVolumeLiters: bottleLiters,
      alcoholPercentage: abvPercent,
      alcoholTaxSek: needsReview ? null : taxSek,
      needsReview,
      productTaxCategory: null,
      smallProducerReductionPct: null,
      snappedAt: opts.snappedAt,
      triggerSource: opts.triggerSource,
    });
  }

  return { lines, needsReviewCount };
}

function formatProductName(
  wineName: string | null | undefined,
  vintage: string | number | null | undefined,
): string {
  const name = wineName?.trim() || "Okänt vin";
  if (vintage == null || vintage === "") return name;
  const v = String(vintage).trim();
  if (!v) return name;
  if (name.endsWith(v)) return name;
  return `${name} ${v}`;
}

function trimOrNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function toDbRow(line: AlcoholTaxReportingLineInput) {
  return {
    reservation_id: line.reservationId,
    order_reservation_item_id: line.orderReservationItemId,
    buyer_full_name: line.buyerFullName,
    buyer_date_of_birth: line.buyerDateOfBirth,
    delivery_street: line.deliveryStreet,
    delivery_postal_code: line.deliveryPostalCode,
    delivery_city: line.deliveryCity,
    delivery_country: line.deliveryCountry,
    wine_id: line.wineId,
    product_name: line.productName,
    quantity: line.quantity,
    volume_liters: line.bottleVolumeLiters * line.quantity,
    bottle_volume_liters: line.bottleVolumeLiters,
    alcohol_percentage: line.alcoholPercentage,
    alcohol_tax_sek: line.alcoholTaxSek,
    needs_review: line.needsReview,
    product_tax_category: line.productTaxCategory,
    small_producer_reduction_pct: line.smallProducerReductionPct,
    snapped_at: line.snappedAt,
    trigger_source: line.triggerSource,
  };
}

/**
 * Load reservation + lines, build frozen rows, insert idempotently
 * (unique on order_reservation_item_id; ignoreDuplicates so we never overwrite).
 */
export async function persistAlcoholTaxReportingSnapshot(opts: {
  reservationId: string;
  triggerSource: AlcoholTaxSnapshotTrigger;
  snappedAt?: Date | string;
}): Promise<{
  ok: boolean;
  inserted: number;
  needsReviewCount: number;
  error?: string;
}> {
  const reservationId = opts.reservationId?.trim();
  if (!reservationId) {
    return { ok: false, inserted: 0, needsReviewCount: 0, error: "missing_reservation_id" };
  }

  const snappedAt =
    typeof opts.snappedAt === "string"
      ? opts.snappedAt
      : (opts.snappedAt ?? new Date()).toISOString();

  const sb = getSupabaseAdmin();

  const { data: reservation, error: resErr } = await sb
    .from("order_reservations")
    .select("id, age_verified_dob, address_id")
    .eq("id", reservationId)
    .maybeSingle();

  if (resErr) {
    console.error("[alcohol-tax-snapshot] load reservation", resErr.message);
    return {
      ok: false,
      inserted: 0,
      needsReviewCount: 0,
      error: resErr.message,
    };
  }
  if (!reservation) {
    return { ok: false, inserted: 0, needsReviewCount: 0, error: "reservation_not_found" };
  }

  const res = reservation as ReservationRow;
  let address: AddressRow | null = null;
  if (res.address_id) {
    const { data: addr, error: addrErr } = await sb
      .from("user_addresses")
      .select(
        "full_name, address_street, address_postcode, address_city, country_code",
      )
      .eq("id", res.address_id)
      .maybeSingle();
    if (addrErr) {
      console.warn("[alcohol-tax-snapshot] load address", addrErr.message);
    } else {
      address = (addr as AddressRow | null) ?? null;
    }
  }

  // Prefer full wine fields; fall back if optional columns are missing on older DBs.
  let itemRows: ItemWineRow[] = [];
  {
    const fullSelect =
      "id, item_id, quantity, wines:item_id ( id, wine_name, vintage, volume_liters, alcohol_percentage, abv, color, classification, tags, additives )";
    const { data: items, error: itemsErr } = await sb
      .from("order_reservation_items")
      .select(fullSelect)
      .eq("reservation_id", reservationId);

    if (
      itemsErr &&
      /column|does not exist|classification|additives|abv|volume_liters|alcohol_percentage|tags/i.test(
        itemsErr.message ?? "",
      )
    ) {
      const { data: fallback, error: fbErr } = await sb
        .from("order_reservation_items")
        .select(
          "id, item_id, quantity, wines:item_id ( id, wine_name, vintage, color )",
        )
        .eq("reservation_id", reservationId);
      if (fbErr) {
        console.error("[alcohol-tax-snapshot] load items", fbErr.message);
        return {
          ok: false,
          inserted: 0,
          needsReviewCount: 0,
          error: fbErr.message,
        };
      }
      itemRows = (fallback ?? []).map((row) => {
        const r = row as {
          id: string;
          item_id: string | null;
          quantity: number | null;
          wines: {
            id: string;
            wine_name: string | null;
            vintage: string | number | null;
            color: string | null;
          } | null;
        };
        return {
          id: r.id,
          item_id: r.item_id,
          quantity: r.quantity,
          wines: r.wines
            ? {
                ...r.wines,
                volume_liters: null,
                alcohol_percentage: null,
                abv: null,
                classification: null,
                tags: null,
                additives: null,
              }
            : null,
        };
      });
    } else if (itemsErr) {
      console.error("[alcohol-tax-snapshot] load items", itemsErr.message);
      return {
        ok: false,
        inserted: 0,
        needsReviewCount: 0,
        error: itemsErr.message,
      };
    } else {
      itemRows = (items ?? []) as unknown as ItemWineRow[];
    }
  }

  const built = buildAlcoholTaxReportingLines({
    reservationId,
    buyer: {
      fullName: address?.full_name ?? null,
      dateOfBirth: res.age_verified_dob ?? null,
      street: address?.address_street ?? null,
      postalCode: address?.address_postcode ?? null,
      city: address?.address_city ?? null,
      country: address?.country_code ?? null,
    },
    items: itemRows.map((row) => {
      const wine = row.wines;
      return {
        orderReservationItemId: row.id,
        wineId: wine?.id ?? row.item_id ?? null,
        wineName: wine?.wine_name ?? null,
        vintage: wine?.vintage ?? null,
        quantity: Number(row.quantity) || 0,
        volumeLiters:
          wine?.volume_liters != null ? Number(wine.volume_liters) : null,
        abv: wine?.abv ?? null,
        alcoholPercentage: wine?.alcohol_percentage ?? null,
        color: wine?.color ?? null,
        classification: wine?.classification ?? null,
        tags: wine?.tags ?? null,
        additives: wine?.additives ?? null,
      };
    }),
    snappedAt,
    triggerSource: opts.triggerSource,
  });

  if (built.lines.length === 0) {
    return { ok: true, inserted: 0, needsReviewCount: 0 };
  }

  for (const line of built.lines) {
    if (!line.needsReview) continue;
    console.warn(
      "[alcohol-tax-snapshot] needs_review — missing/out-of-band ABV or fortified/mellanklass",
      {
        reservationId,
        itemId: line.orderReservationItemId,
        wineId: line.wineId,
        abvPercent: line.alcoholPercentage,
      },
    );
  }

  const rows = built.lines.map(toDbRow);
  const { error: insertErr, count } = await sb
    .from("alcohol_tax_reporting_lines")
    .upsert(rows, {
      onConflict: "order_reservation_item_id",
      ignoreDuplicates: true,
      count: "exact",
    });

  if (insertErr) {
    console.error("[alcohol-tax-snapshot] upsert", insertErr.message);
    return {
      ok: false,
      inserted: 0,
      needsReviewCount: built.needsReviewCount,
      error: insertErr.message,
    };
  }

  return {
    ok: true,
    inserted: count ?? rows.length,
    needsReviewCount: built.needsReviewCount,
  };
}

/**
 * Best-effort snapshot write — logs and swallows errors so charge/confirm
 * paths are never blocked by reporting persistence.
 */
export async function tryPersistAlcoholTaxReportingSnapshot(opts: {
  reservationId: string;
  triggerSource: AlcoholTaxSnapshotTrigger;
  snappedAt?: Date | string;
}): Promise<void> {
  try {
    const result = await persistAlcoholTaxReportingSnapshot(opts);
    if (!result.ok) {
      console.warn("[alcohol-tax-snapshot] persist failed", {
        reservationId: opts.reservationId,
        triggerSource: opts.triggerSource,
        error: result.error,
      });
      return;
    }
    if (result.needsReviewCount > 0) {
      console.warn("[alcohol-tax-snapshot] lines need review", {
        reservationId: opts.reservationId,
        needsReviewCount: result.needsReviewCount,
      });
    }
  } catch (e) {
    console.warn("[alcohol-tax-snapshot] unexpected", e);
  }
}
