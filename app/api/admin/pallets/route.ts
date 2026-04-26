import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";

type WineSummaryRow = {
  wine_name: string;
  vintage: string;
  grape_varieties: string;
  color: string;
  producer: string;
  producer_id: string;
  total_quantity: number;
  base_price_cents: number;
  /** Producer MOQ (bottles); fill totals ignore MOQ — for admin display only. */
  moq_min_bottles?: number;
  /** Total bottles from this producer on this pallet (same fill rules as totals). */
  producer_bottles_on_pallet?: number;
  /** Whether producer_bottles_on_pallet meets moq_min_bottles when MOQ is greater than zero. */
  producer_moq_met?: boolean;
};

type WineJoin = {
  wine_name: string | null;
  vintage: string | null;
  grape_varieties: string | null;
  color: string | null;
  base_price_cents: number | null;
  producer_id: string | null;
};

type ReservationRow = { id: string; pallet_id: string | null };

type ItemRow = {
  reservation_id: string;
  item_id: string | null;
  quantity: number | null;
};

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    const { data, error } = await sb
      .from("pallets")
      .select(
        `
        *,
        delivery_zone:pallet_zones!delivery_zone_id(id, name, zone_type),
        pickup_zone:pallet_zones!pickup_zone_id(id, name, zone_type),
        shipping_region:shipping_regions(id, name),
        current_pickup_producer:producers!current_pickup_producer_id(id, name, is_pallet_zone)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pallets:", error);
      return NextResponse.json([]);
    }

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    const pallets = data as Record<string, unknown>[];
    const palletIds = pallets
      .map((p) => p.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const bottlesByPalletId = new Map<string, number>();
    const wineAggByPalletId = new Map<string, Record<string, WineSummaryRow>>();
    const producerQtyByPalletKey = new Map<string, number>();

    const statuses = [...PALLET_FILL_STATUSES];

    if (palletIds.length > 0) {
      const { data: reservations, error: resErr } = await sb
        .from("order_reservations")
        .select("id, pallet_id")
        .in("pallet_id", palletIds)
        .in("status", statuses);

      if (resErr) {
        console.error("Error fetching reservations for pallet stats:", resErr);
        return NextResponse.json([]);
      }

      const resList = (reservations ?? []) as ReservationRow[];
      const reservationIdToPalletId = new Map<string, string>();
      for (const r of resList) {
        if (typeof r.pallet_id === "string" && r.pallet_id) {
          reservationIdToPalletId.set(r.id, r.pallet_id);
        }
      }

      const reservationIds = [...reservationIdToPalletId.keys()];
      if (reservationIds.length === 0) {
        // no reservations — bottles maps stay empty
      } else {
        const { data: items, error: itemsErr } = await sb
          .from("order_reservation_items")
          .select("reservation_id, item_id, quantity")
          .in("reservation_id", reservationIds);

        if (itemsErr) {
          console.error("Error fetching reservation items for pallet stats:", itemsErr);
          return NextResponse.json([]);
        }

        const itemRows = (items ?? []) as ItemRow[];
        const wineIds = [
          ...new Set(
            itemRows
              .map((i) => i.item_id)
              .filter((id): id is string => typeof id === "string" && id.length > 0),
          ),
        ];

        const wineById = new Map<string, WineJoin>();
        if (wineIds.length > 0) {
          const { data: wines, error: winesErr } = await sb
            .from("wines")
            .select(
              "id, wine_name, vintage, grape_varieties, color, base_price_cents, producer_id",
            )
            .in("id", wineIds);

          if (winesErr) {
            console.error("Error fetching wines for pallet stats:", winesErr);
            return NextResponse.json([]);
          }
          for (const w of (wines ?? []) as (WineJoin & { id: string })[]) {
            wineById.set(w.id, w);
          }
        }

        const producerIds = [
          ...new Set(
            [...wineById.values()]
              .map((w) => w.producer_id)
              .filter((id): id is string => typeof id === "string" && id.length > 0),
          ),
        ];

        const producerNameById = new Map<string, string>();
        const moqByProducerId = new Map<string, number>();

        if (producerIds.length > 0) {
          const primary = await sb
            .from("producers")
            .select("id, name, pickup_zone_id, moq_min_bottles")
            .in("id", producerIds);

          let producers = primary.data as
            | { id: string; name: string | null; moq_min_bottles?: number | null }[]
            | null;
          let prodErr = primary.error;

          if (prodErr) {
            const msg = String(
              prodErr && typeof prodErr === "object" && "message" in prodErr
                ? (prodErr as { message: string }).message
                : prodErr,
            );
            const isMissingMoqColumn =
              msg.includes("moq_min_bottles") &&
              (msg.includes("schema cache") || msg.includes("column"));

            if (isMissingMoqColumn) {
              const fallback = await sb
                .from("producers")
                .select("id, name, pickup_zone_id")
                .in("id", producerIds);
              producers = fallback.data as typeof producers;
              prodErr = fallback.error;
            }
          }

          if (prodErr) {
            console.error("Error fetching producers for pallet stats:", prodErr);
            return NextResponse.json([]);
          }

          for (const p of producers ?? []) {
            if (p?.name) producerNameById.set(p.id, p.name);
            const raw = "moq_min_bottles" in p ? p.moq_min_bottles : undefined;
            const parsed =
              raw === null || raw === undefined
                ? 0
                : Math.max(0, Math.floor(Number(raw) || 0));
            moqByProducerId.set(p.id, parsed);
          }
        }

        for (const it of itemRows) {
          const palletId = reservationIdToPalletId.get(it.reservation_id);
          if (!palletId || !it.item_id) continue;

          const qty = Math.max(0, Math.floor(Number(it.quantity) || 0));
          bottlesByPalletId.set(
            palletId,
            (bottlesByPalletId.get(palletId) ?? 0) + qty,
          );

          const wine = wineById.get(it.item_id);
          if (!wine?.producer_id) continue;

          const producerKey = `${palletId}|${wine.producer_id}`;
          producerQtyByPalletKey.set(
            producerKey,
            (producerQtyByPalletKey.get(producerKey) ?? 0) + qty,
          );

          const wineKey = it.item_id;
          const agg = wineAggByPalletId.get(palletId) ?? {};

          if (!agg[wineKey]) {
            const moq = moqByProducerId.get(wine.producer_id) ?? 0;
            agg[wineKey] = {
              wine_name: String(wine.wine_name ?? ""),
              vintage: String(wine.vintage ?? ""),
              grape_varieties: String(wine.grape_varieties ?? ""),
              color: String(wine.color ?? ""),
              producer: producerNameById.get(wine.producer_id) ?? "Unknown",
              producer_id: wine.producer_id,
              total_quantity: 0,
              base_price_cents: Number(wine.base_price_cents) || 0,
              moq_min_bottles: moq > 0 ? moq : undefined,
            };
          }
          agg[wineKey].total_quantity += qty;
          wineAggByPalletId.set(palletId, agg);
        }

        for (const palletId of palletIds) {
          const agg = wineAggByPalletId.get(palletId);
          if (!agg) continue;
          for (const row of Object.values(agg)) {
            const mk = `${palletId}|${row.producer_id}`;
            const tot = producerQtyByPalletKey.get(mk) ?? 0;
            const moq = moqByProducerId.get(row.producer_id) ?? 0;
            row.producer_bottles_on_pallet = tot;
            row.producer_moq_met = moq <= 0 || tot >= moq;
            row.moq_min_bottles = moq > 0 ? moq : undefined;
          }
        }
      }
    }

    const transformedData = pallets.map((pallet) => {
      const id = String(pallet.id);
      const cap = Number(pallet.bottle_capacity) || 0;
      const totalBookedBottles = bottlesByPalletId.get(id) ?? 0;
      const remainingBottles = Math.max(0, cap - totalBookedBottles);
      const completionPercentage =
        cap > 0 ? Math.min(100, (totalBookedBottles / cap) * 100) : 0;
      const wineSummary = wineAggByPalletId.get(id) ?? {};

      const shippingRegionId = pallet.shipping_region_id;
      const pallet_type: "region_based" | "zone_based" =
        typeof shippingRegionId === "string" && shippingRegionId.length > 0
          ? "region_based"
          : "zone_based";

      const cpp = pallet.current_pickup_producer as
        | { id?: string; name?: string | null; is_pallet_zone?: boolean | null }
        | null
        | undefined;
      let pickup_is_fallback = false;
      if (cpp && typeof cpp.id === "string" && cpp.id.length > 0) {
        pickup_is_fallback = cpp.is_pallet_zone !== true;
      }

      return {
        ...pallet,
        pallet_type,
        total_booked_bottles: totalBookedBottles,
        remaining_bottles: remainingBottles,
        completion_percentage: completionPercentage,
        wine_summary: Object.values(wineSummary),
        is_complete: totalBookedBottles >= cap,
        needs_ordering: remainingBottles > 0,
        pickup_is_fallback,
      };
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Unexpected error in pallets API:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const sb = getSupabaseAdmin();
  const body = await request.json();

  const { data, error } = await sb
    .from("pallets")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
