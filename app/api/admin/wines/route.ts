import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getAppUrl } from "@/lib/app-url";
import { calculateB2BPriceExclVat } from "@/lib/price-breakdown";

/**
 * GET /api/admin/wines
 * List all wines for admin (e.g. wine tasting session setup).
 * Query: for_invoice=1 – return warehouse (B2B) price per wine (b2b_price_excl_vat in SEK), same logic as tasting summary / dirtywine.se.
 * Query: b2b_in_stock=1 (with for_invoice=1) – only wines with B2B lager (b2b_stock > 0 and/or remaining pallet bottles).
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    const user = await getCurrentUser();

    let isAdmin = !!admin;
    if (!isAdmin && user) {
      const sb = getSupabaseAdmin();
      const { data: profile } = await sb
        .from("profiles")
        .select("roles, role")
        .eq("id", user.id)
        .single();
      isAdmin =
        profile?.roles?.includes("admin") ||
        profile?.role === "admin" ||
        (user as { roles?: string[]; role?: string }).roles?.includes("admin") ||
        (user as { role?: string }).role === "admin";
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const forInvoice = searchParams.get("for_invoice") === "1";
    const b2bInStockOnly = searchParams.get("b2b_in_stock") === "1";

    const sb = getSupabaseAdmin();
    const selectFields = `
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        label_image_path,
        base_price_cents,
        cost_amount,
        cost_currency,
        exchange_rate,
        alcohol_tax_cents,
        b2b_stock,
        producers(name)
        ${forInvoice ? ", b2b_margin_percentage" : ""}
      `;
    const { data: wines, error } = await sb
      .from("wines")
      .select(selectFields)
      .order("wine_name")
      .order("vintage", { ascending: false });

    if (error) {
      console.error("Error fetching wines:", error);
      return NextResponse.json(
        { error: "Failed to fetch wines", details: error.message },
        { status: 500 },
      );
    }

    let rawWines = (wines ?? []) as any[];

    if (!forInvoice || rawWines.length === 0) {
      return NextResponse.json(rawWines);
    }

    // Same price logic as tasting summary / dirtywine.se: EUR default, API rate first, per-wine shipping from pallets
    const currencies = [
      ...new Set(
        rawWines
          .map((w: any) => (w.cost_currency || "EUR") as string)
          .filter((c: string) => c),
      ),
    ] as string[];
    const rateMap = new Map<string, number>();
    rateMap.set("SEK", 1);
    for (const currency of currencies.filter((c) => c !== "SEK")) {
      try {
        const res = await fetch(
          `${getAppUrl()}/api/exchange-rates?from=${currency}&to=SEK`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.rate != null) rateMap.set(currency, data.rate);
        }
      } catch {
        /* keep default */
      }
    }

    const wineIds = rawWines.map((w: any) => w.id);
    const b2bShippingMap = new Map<string, number>();
    try {
      const { data: palletItems } = await sb
        .from("b2b_pallet_shipment_items")
        .select("wine_id, quantity, quantity_sold, shipment_id, b2b_pallet_shipments!inner(cost_cents)")
        .in("wine_id", wineIds);
      const items = (palletItems ?? []) as { wine_id: string; quantity: number; quantity_sold?: number; shipment_id: string; b2b_pallet_shipments: { cost_cents?: number } }[];
      const shipmentIds = [...new Set(items.map((r) => r.shipment_id).filter(Boolean))];
      const totalBottlesByShipment = new Map<string, number>();
      if (shipmentIds.length > 0) {
        const { data: allItems } = await sb
          .from("b2b_pallet_shipment_items")
          .select("shipment_id, quantity")
          .in("shipment_id", shipmentIds);
        (allItems ?? []).forEach((row: { shipment_id: string; quantity: number }) => {
          const sid = row.shipment_id;
          totalBottlesByShipment.set(sid, (totalBottlesByShipment.get(sid) ?? 0) + (row.quantity ?? 0));
        });
      }
      const byWine = new Map<string, { remaining: number; shippingSum: number }>();
      items.forEach((row) => {
        const remaining = Math.max(0, (row.quantity ?? 0) - (row.quantity_sold ?? 0));
        const costCents = row.b2b_pallet_shipments?.cost_cents ?? 0;
        const totalBottles = totalBottlesByShipment.get(row.shipment_id) ?? 1;
        const shippingPerBottle = totalBottles > 0 ? costCents / 100 / totalBottles : 0;
        const wid = row.wine_id;
        const curr = byWine.get(wid) ?? { remaining: 0, shippingSum: 0 };
        curr.remaining += remaining;
        curr.shippingSum += shippingPerBottle * remaining;
        byWine.set(wid, curr);
      });
      byWine.forEach((v, wid) => {
        if (v.remaining > 0) b2bShippingMap.set(wid, v.shippingSum / v.remaining);
      });
    } catch {
      /* table may not exist */
    }

    if (forInvoice && b2bInStockOnly) {
      rawWines = rawWines.filter((w: any) => {
        const stock = w.b2b_stock;
        const fromColumn = typeof stock === "number" ? stock > 0 : Number(stock) > 0;
        const fromPallet = b2bShippingMap.has(w.id);
        return fromColumn || fromPallet;
      });
    }

    const result = rawWines.map((w: any) => {
      const costCurrency = (w.cost_currency || "EUR") as string;
      const effectiveExchangeRate = rateMap.get(costCurrency) ?? w.exchange_rate ?? 1;
      const costAmount = w.cost_amount ?? 0;
      const alcoholTaxCents = w.alcohol_tax_cents ?? 0;
      const b2bMarginPct = w.b2b_margin_percentage ?? null;
      const hasB2BMargin =
        b2bMarginPct != null && b2bMarginPct >= 0 && b2bMarginPct < 100 && costAmount > 0;
      const shippingPerBottleSek = b2bShippingMap.get(w.id) ?? 0;
      const b2bPriceExclVat = hasB2BMargin
        ? Math.round(
            calculateB2BPriceExclVat(
              costAmount,
              effectiveExchangeRate,
              alcoholTaxCents,
              b2bMarginPct,
              shippingPerBottleSek,
            ) * 100,
          ) / 100
        : null;
      return {
        ...w,
        b2b_price_excl_vat: b2bPriceExclVat,
      };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Error in GET /api/admin/wines:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch wines",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
