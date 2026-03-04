import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { calculateB2BPriceExclVat } from "@/lib/price-breakdown";

async function ensureSessionAccess(
  sb: ReturnType<typeof getSupabaseAdmin>,
  sessionId: string,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  const { data: session, error } = await sb
    .from("wine_tasting_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .single();

  if (error || !session) return { allowed: false, error: 404 as const };
  if (session.status === "active") return { allowed: true };
  // Allow anyone to view summary of completed sessions (link-based access)
  if (session.status === "completed") return { allowed: true };
  if (!user) return { allowed: false, error: 403 as const };

  const { data: profile } = await sb
    .from("profiles")
    .select("roles, role")
    .eq("id", user.id)
    .single();
  const isAdmin =
    profile?.roles?.includes("admin") || profile?.role === "admin";
  if (isAdmin) return { allowed: true };

  const { data: participant } = await sb
    .from("wine_tasting_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { allowed: !!participant, error: 403 as const };
}

/**
 * GET /api/wine-tastings/[id]/summary
 * Session summary: session info, statistics, and per-wine stats with ratings.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sessionId } = await params;
    const sb = getSupabaseAdmin();
    const user = await getCurrentUser();
    const { allowed, error: accessError } = await ensureSessionAccess(sb, sessionId, user);
    if (!allowed) {
      return NextResponse.json(
        { error: accessError === 404 ? "Session not found" : "Access denied" },
        { status: accessError },
      );
    }

    const { data: session, error: sessionError } = await sb
      .from("wine_tasting_sessions")
      .select("id, name, status, created_at, completed_at, wine_order")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let wineOrder = (session.wine_order as string[] | null) ?? [];
    const { data: ratings } = await sb
      .from("wine_tasting_ratings")
      .select(`
        wine_id,
        rating,
        comment,
        created_at,
        participant:wine_tasting_participants(id, name, participant_code, is_anonymous)
      `)
      .eq("session_id", sessionId);

    const { data: participants } = await sb
      .from("wine_tasting_participants")
      .select("id")
      .eq("session_id", sessionId);

    const totalParticipants = participants?.length ?? 0;
    const totalRatings = ratings?.length ?? 0;

    // If wine_order is empty but we have ratings, derive wine list from rated wines (preserve order of first rating)
    if (wineOrder.length === 0 && (ratings?.length ?? 0) > 0) {
      const seen = new Set<string>();
      wineOrder = (ratings ?? []).map((r: { wine_id: string }) => r.wine_id).filter((id: string) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }

    const totalWines = wineOrder.length;
    const overallAverage =
      totalRatings > 0
        ? Math.round(
            (ratings!.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0) /
              totalRatings) *
            10
          ) / 10
        : null;

    let wines: Array<{
      wine: {
        id: string;
        wine_name: string;
        vintage: string;
        grape_varieties?: string;
        color?: string;
        label_image_path?: string;
        description?: string | null;
        base_price_cents?: number | null;
        price_includes_vat?: boolean | null;
        cost_amount?: number | null;
        exchange_rate?: number | null;
        alcohol_tax_cents?: number | null;
        margin_percentage?: number | null;
        b2b_margin_percentage?: number | null;
        b2b_price_excl_vat?: number | null;
        b2b_shipping_per_bottle_sek?: number | null;
        b2b_stock?: number | null;
        producer_name?: string | null;
      };
      totalRatings: number;
      averageRating: number | null;
      ratings: Array<{
        rating: number;
        comment: string | null;
        participant: {
          id: string;
          name: string | null;
          participant_code: string;
          is_anonymous: boolean;
        };
        tasted_at: string;
      }>;
    }> = [];

    if (wineOrder.length > 0) {
      const { data: winesData } = await sb
        .from("wines")
        .select("id, wine_name, vintage, grape_varieties, color, label_image_path, description, base_price_cents, price_includes_vat, cost_amount, cost_currency, exchange_rate, alcohol_tax_cents, margin_percentage, b2b_margin_percentage, b2b_stock, producers(name)")
        .in("id", wineOrder);

      const winesMap = new Map((winesData ?? []).map((w: any) => [w.id, w]));

      // Exchange rates: same logic as dirtywine.se (products-data) – default cost_currency EUR, prefer API rate
      const currencies = [
        ...new Set(
          (winesData ?? [])
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

      // B2B frakt per flaska och lager från pallar (samma logik som products-data)
      const b2bShippingMap = new Map<string, number>();
      const b2bStockMap = new Map<string, number>();
      try {
        const { data: palletItems } = await sb
          .from("b2b_pallet_shipment_items")
          .select("wine_id, quantity, quantity_sold, shipment_id, b2b_pallet_shipments!inner(cost_cents)")
          .in("wine_id", wineOrder);
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
          b2bStockMap.set(wid, v.remaining);
          if (v.remaining > 0) b2bShippingMap.set(wid, v.shippingSum / v.remaining);
        });
      } catch {
        /* table may not exist */
      }

      for (const wineId of wineOrder) {
        const wine = winesMap.get(wineId);
        if (!wine) continue;

        const wineRatings = (ratings ?? []).filter(
          (r: { wine_id: string }) => r.wine_id === wineId,
        );
        const partMap = new Map<
          string,
          { id: string; name: string | null; participant_code: string; is_anonymous: boolean }
        >();
        for (const r of wineRatings) {
          const p =
            (r as any).participant ??
            (r as any).wine_tasting_participants;
          if (p && !partMap.has(p.id)) {
            partMap.set(p.id, {
              id: p.id,
              name: p.name ?? null,
              participant_code: p.participant_code ?? "",
              is_anonymous: p.is_anonymous ?? false,
            });
          }
        }

        const totalR = wineRatings.length;
        const avg =
          totalR > 0
            ? Math.round(
                (wineRatings.reduce((a: number, r: { rating: number }) => a + r.rating, 0) /
                  totalR) *
                10
              ) / 10
            : null;

        const prods = (wine as any).producers;
        const producerName =
          prods && typeof prods === "object" && !Array.isArray(prods)
            ? prods.name ?? null
            : Array.isArray(prods) && prods[0]?.name
              ? prods[0].name
              : null;
        const baseCents = (wine as any).base_price_cents ?? null;
        const priceInclVat = (wine as any).price_includes_vat !== false;
        const w = wine as any;
        const costCurrency = (w.cost_currency || "EUR") as string;
        const effectiveExchangeRate =
          rateMap.get(costCurrency) ?? w.exchange_rate ?? 1;
        const costAmount = w.cost_amount ?? 0;
        const alcoholTaxCents = w.alcohol_tax_cents ?? 0;
        const b2bMarginPct = w.b2b_margin_percentage ?? null;
        const hasB2BMargin =
          b2bMarginPct != null &&
          b2bMarginPct >= 0 &&
          b2bMarginPct < 100 &&
          costAmount > 0;
        // Same as dirtywine.se (products-data): per-wine shipping from pallets, always calculate B2B price
        const shippingPerBottleSek = b2bShippingMap.get(wineId) ?? 0;
        const b2bPriceExclVat =
          hasB2BMargin
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
        wines.push({
          wine: {
            id: wine.id,
            wine_name: wine.wine_name,
            vintage: wine.vintage,
            grape_varieties: wine.grape_varieties,
            color: wine.color,
            label_image_path: wine.label_image_path,
            description: w.description ?? null,
            base_price_cents: baseCents,
            price_includes_vat: priceInclVat,
            cost_amount: w.cost_amount ?? null,
            exchange_rate: effectiveExchangeRate,
            alcohol_tax_cents: w.alcohol_tax_cents ?? null,
            margin_percentage: w.margin_percentage ?? null,
            b2b_margin_percentage: b2bMarginPct,
            b2b_price_excl_vat: b2bPriceExclVat,
            b2b_cost_sek: null,
            b2b_shipping_per_bottle_sek: hasB2BMargin ? shippingPerBottleSek : null,
            b2b_stock: (() => {
              const fromPallets = b2bStockMap.get(wineId);
              if (fromPallets != null) return fromPallets;
              const fromWine = (wine as { b2b_stock?: number | null }).b2b_stock;
              return fromWine != null ? Number(fromWine) : null;
            })(),
            producer_name: producerName ?? null,
          },
          totalRatings: totalR,
          averageRating: avg,
          ratings: wineRatings.map((r: any) => {
            const p = r.participant ?? r.wine_tasting_participants;
            return {
              rating: r.rating,
              comment: r.comment ?? null,
              participant: partMap.get(p?.id) ?? {
                id: p?.id ?? "",
                name: p?.name ?? null,
                participant_code: p?.participant_code ?? "",
                is_anonymous: p?.is_anonymous ?? false,
              },
              tasted_at: r.created_at ?? new Date().toISOString(),
            };
          }),
        });
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        created_at: session.created_at,
        completed_at: session.completed_at,
      },
      statistics: {
        totalWines,
        totalParticipants,
        totalRatings,
        overallAverage,
      },
      wines,
    });
  } catch (err: unknown) {
    console.error("Error in GET /api/wine-tastings/[id]/summary:", err);
    return NextResponse.json(
      {
        error: "Failed to load summary",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
