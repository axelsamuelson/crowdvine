import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { evaluateCompletionRules } from "@/lib/pallet-completion-rules";
import { getAppUrl } from "@/lib/app-url";

async function fetchExchangeRate(origin: string, from: string) {
  if (!from || from === "SEK") return 1.0;
  try {
    const url = new URL("/api/exchange-rates", origin);
    url.searchParams.set("from", from);
    url.searchParams.set("to", "SEK");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return 1.0;
    const data: any = await res.json();
    const rate = Number(data?.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : 1.0;
  } catch {
    return 1.0;
  }
}

// GET all pallets (for invitation page, etc.)
export async function GET(request: NextRequest) {
  try {
    const sb = getSupabaseAdmin();

    // Fetch all pallets with zone info
    const { data: pallets, error } = await sb
      .from("pallets")
      .select(
        `
        id,
        from_zone_id,
        to_zone_id,
        capacity_bottles,
        status
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pallets:", error);
      return NextResponse.json(
        { error: "Failed to fetch pallets" },
        { status: 500 },
      );
    }

    // Calculate total bottles for each pallet and fetch zone names
    const palletsWithData = await Promise.all(
      (pallets || []).map(async (pallet: any) => {
        // Get zone names
        const { data: fromZone } = await sb
          .from("pallet_zones")
          .select("name")
          .eq("id", pallet.from_zone_id)
          .maybeSingle();

        const { data: toZone } = await sb
          .from("pallet_zones")
          .select("name")
          .eq("id", pallet.to_zone_id)
          .maybeSingle();

        // Count total bottles on this pallet
        const { count } = await sb
          .from("order_reservation_items")
          .select("*", { count: "exact", head: true })
          .eq("pallet_id", pallet.id);

        const totalBottles = count || 0;

        return {
          id: pallet.id,
          from_zone_name: fromZone?.name || "Unknown",
          to_zone_name: toZone?.name || "Unknown",
          capacity_bottles: pallet.capacity_bottles || 720,
          total_bottles_on_pallet: totalBottles,
          status: pallet.status,
        };
      }),
    );

    return NextResponse.json(palletsWithData);
  } catch (error) {
    console.error("Pallet data GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pallet data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { palletIds } = await request.json();

    if (!palletIds || !Array.isArray(palletIds)) {
      return NextResponse.json(
        { error: "Invalid pallet IDs" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const origin =
      request.headers.get("origin") || getAppUrl();

    // Get pallet information (with zone ids so we can compute totals data-driven)
    const { data: pallets, error: palletsError } = await sb
      .from("pallets")
      // Select * so we can read optional completion_rules without breaking older DBs.
      .select("*")
      .in("id", palletIds);

    if (palletsError) {
      console.error("Error fetching pallets:", palletsError);
      return NextResponse.json(
        { error: "Failed to fetch pallets" },
        { status: 500 },
      );
    }

    const pickupZoneIds = Array.from(
      new Set((pallets || []).map((p: any) => p.pickup_zone_id).filter(Boolean)),
    ) as string[];
    const deliveryZoneIds = Array.from(
      new Set(
        (pallets || []).map((p: any) => p.delivery_zone_id).filter(Boolean),
      ),
    ) as string[];

    const palletIdByKey = new Map<string, string>();
    (pallets || []).forEach((p: any) => {
      if (p.pickup_zone_id && p.delivery_zone_id) {
        palletIdByKey.set(`${p.pickup_zone_id}|${p.delivery_zone_id}`, p.id);
      }
    });

    // Data-driven current bottle counts:
    // Active reservations -> items -> wines -> producers.pickup_zone_id + reservation.delivery_zone_id -> pallet
    const activeStatuses = ["placed", "approved", "partly_approved", "pending_payment", "confirmed"];

    const { data: reservations, error: resErr } = await sb
      .from("order_reservations")
      .select("id, delivery_zone_id")
      .in("status", activeStatuses)
      .in("delivery_zone_id", deliveryZoneIds);

    if (resErr) {
      console.error("Error fetching reservations for pallet totals:", resErr);
      return NextResponse.json(
        { error: "Failed to fetch reservations" },
        { status: 500 },
      );
    }

    const reservationIds = (reservations || []).map((r: any) => r.id);
    const deliveryZoneByReservationId = new Map<string, string>();
    (reservations || []).forEach((r: any) => {
      if (r.delivery_zone_id) deliveryZoneByReservationId.set(r.id, r.delivery_zone_id);
    });

    const bottlesByPalletId = new Map<string, number>();
    const profitCentsByPalletId = new Map<string, number>(); // ex VAT, SEK cents

    if (reservationIds.length > 0) {
      const { data: items, error: itemsErr } = await sb
        .from("order_reservation_items")
          .select("reservation_id, item_id, quantity, producer_approved_quantity")
        .in("reservation_id", reservationIds);

      if (itemsErr) {
        console.error("Error fetching reservation items for pallet totals:", itemsErr);
        return NextResponse.json(
          { error: "Failed to fetch reservation items" },
          { status: 500 },
        );
      }

      const wineIds = Array.from(
        new Set((items || []).map((i: any) => i.item_id).filter(Boolean)),
      ) as string[];

      const producerIdByWineId = new Map<string, string>();
      const wineById = new Map<
        string,
        {
          id: string;
          producer_id: string;
          base_price_cents: number;
          price_includes_vat: boolean | null;
          cost_currency: string | null;
          cost_amount: number | null;
        }
      >();
      if (wineIds.length > 0) {
        const { data: wines, error: winesErr } = await sb
          .from("wines")
          .select(
            "id, producer_id, base_price_cents, price_includes_vat, cost_currency, cost_amount",
          )
          .in("id", wineIds);

        if (winesErr) {
          console.error("Error fetching wines for pallet totals:", winesErr);
          return NextResponse.json(
            { error: "Failed to fetch wines" },
            { status: 500 },
          );
        }
        (wines || []).forEach((w: any) => {
          if (w?.id && w?.producer_id) producerIdByWineId.set(w.id, w.producer_id);
          if (w?.id) {
            wineById.set(w.id, {
              id: w.id,
              producer_id: w.producer_id,
              base_price_cents: Number(w.base_price_cents) || 0,
              price_includes_vat:
                w.price_includes_vat === null || w.price_includes_vat === undefined
                  ? true
                  : Boolean(w.price_includes_vat),
              cost_currency: w.cost_currency || "SEK",
              cost_amount:
                w.cost_amount === null || w.cost_amount === undefined
                  ? null
                  : Number(w.cost_amount),
            });
          }
        });
      }

      const producerIds = Array.from(new Set(Array.from(producerIdByWineId.values())));
      const pickupZoneByProducerId = new Map<string, string>();
      const moqByProducerId = new Map<string, number>();
      if (producerIds.length > 0) {
        // NOTE: During rollout, the DB may not yet have the `moq_min_bottles` column.
        // We attempt to select it, but gracefully fall back to MOQ=0 if the column doesn't exist.
        const primary = await sb
          .from("producers")
          .select("id, pickup_zone_id, moq_min_bottles")
          .in("id", producerIds);

        let producers = primary.data as any[] | null;
        let prodErr = primary.error;

        if (prodErr) {
          const msg = String((prodErr as any)?.message || prodErr);
          const isMissingMoqColumn =
            msg.includes("moq_min_bottles") && (msg.includes("schema cache") || msg.includes("column"));

          if (isMissingMoqColumn) {
            const fallback = await sb
              .from("producers")
              .select("id, pickup_zone_id")
              .in("id", producerIds);
            producers = fallback.data as any[] | null;
            prodErr = fallback.error;
          }
        }

        if (prodErr) {
          console.error("Error fetching producers for pallet totals:", prodErr);
          return NextResponse.json({ error: "Failed to fetch producers" }, { status: 500 });
        }

        (producers || []).forEach((p: any) => {
          if (p?.id && p?.pickup_zone_id) pickupZoneByProducerId.set(p.id, p.pickup_zone_id);
          if (p?.id) {
            const raw = p?.moq_min_bottles;
            const parsed =
              raw === null || raw === undefined ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
            moqByProducerId.set(p.id, parsed);
          }
        });
      }

      // Exchange rates per currency used in wines
      const currencies = Array.from(
        new Set(
          Array.from(wineById.values())
            .map((w) => w.cost_currency || "SEK")
            .filter(Boolean),
        ),
      ) as string[];
      const rateByCurrency = new Map<string, number>();
      for (const c of currencies) {
        rateByCurrency.set(c, await fetchExchangeRate(origin, c));
      }

      // First pass: derive per-producer totals within each pallet so we can apply MOQ.
      const bottlesByPalletProducerKey = new Map<string, number>();
      const lineItems: Array<{
        palletId: string;
        producerId: string;
        qty: number;
        netProfitCentsPerBottle: number;
      }> = [];

      for (const it of items || []) {
        const deliveryZoneId = deliveryZoneByReservationId.get(it.reservation_id);
        if (!deliveryZoneId) continue;

        const producerId = producerIdByWineId.get(it.item_id);
        if (!producerId) continue;

        const pickupZoneId = pickupZoneByProducerId.get(producerId);
        if (!pickupZoneId) continue;

        // Only count if this (pickupZone, deliveryZone) corresponds to one of the requested pallets
        if (!pickupZoneIds.includes(pickupZoneId)) continue;

        const palletId = palletIdByKey.get(`${pickupZoneId}|${deliveryZoneId}`);
        if (!palletId) continue;

        // For approved/partly approved flows, count approved quantity when present.
        const qty =
          it.producer_approved_quantity === null ||
          it.producer_approved_quantity === undefined
            ? it.quantity || 0
            : Number(it.producer_approved_quantity) || 0;
        const producerKey = `${palletId}|${producerId}`;
        bottlesByPalletProducerKey.set(
          producerKey,
          (bottlesByPalletProducerKey.get(producerKey) || 0) + qty,
        );

        // Profit (ex VAT) in SEK cents for this line (best-effort; if costs missing, treat as 0 profit)
        const wine = wineById.get(it.item_id);
        if (!wine) continue;
        const priceExVatCents = wine.price_includes_vat
          ? Math.round(wine.base_price_cents / 1.25)
          : wine.base_price_cents;

        const rate = rateByCurrency.get(wine.cost_currency || "SEK") || 1.0;
        const costWineSekCents =
          wine.cost_amount === null ? 0 : Math.round(wine.cost_amount * rate * 100);
        const alcoholTaxCents = 2219;
        const costExVatCents = costWineSekCents + alcoholTaxCents;
        const netProfitCentsPerBottle = priceExVatCents - costExVatCents;

        lineItems.push({ palletId, producerId, qty, netProfitCentsPerBottle });
      }

      // Determine eligibility: a producer's bottles only count toward pallet totals if they meet MOQ within that pallet.
      const eligibleByPalletProducerKey = new Map<string, boolean>();
      for (const [key, producerTotal] of bottlesByPalletProducerKey.entries()) {
        const producerId = key.split("|")[1];
        const moq = moqByProducerId.get(producerId) || 0;
        eligibleByPalletProducerKey.set(key, producerTotal >= moq);
      }

      // Second pass: sum pallet totals from eligible producers only.
      for (const li of lineItems) {
        const key = `${li.palletId}|${li.producerId}`;
        if (!eligibleByPalletProducerKey.get(key)) continue;

        bottlesByPalletId.set(
          li.palletId,
          (bottlesByPalletId.get(li.palletId) || 0) + li.qty,
        );
        profitCentsByPalletId.set(
          li.palletId,
          (profitCentsByPalletId.get(li.palletId) || 0) + li.netProfitCentsPerBottle * li.qty,
        );
      }
    }

    const palletsWithBottles = (pallets || []).map((pallet: any) => {
      const currentBottles = bottlesByPalletId.get(pallet.id) || 0;
      const profitCents = profitCentsByPalletId.get(pallet.id) || 0;
      const profitSek = Math.round(profitCents / 100);

      // Optional rules stored on pallet (best effort; if missing, default to capacity)
      const rules = (pallet as any).completion_rules || null;
      const evaluated = evaluateCompletionRules(rules, {
        bottles: currentBottles,
        profit_sek: profitSek,
      });
      const isComplete =
        evaluated === null
          ? currentBottles >= (Number(pallet.bottle_capacity) || 0)
          : evaluated;

      return {
        id: pallet.id,
        name: pallet.name,
        status: pallet.status,
        bottle_capacity: pallet.bottle_capacity,
        current_bottles: currentBottles,
        profit_cents_ex_vat: profitCents,
        profit_sek_ex_vat: profitSek,
        is_complete: isComplete,
      };
    });

    console.log(
      `✅ Fetched ${palletsWithBottles.length} pallets with bottle counts`,
    );

    return NextResponse.json({ pallets: palletsWithBottles });
  } catch (error) {
    console.error("Pallet data API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
