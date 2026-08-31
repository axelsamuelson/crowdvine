import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import {
  classifyHistoricalShippingRow,
  summarizeHistoricalShippingAudit,
} from "@/lib/finance/historical-shipping-audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/shipping-audit
 * Read-only reconstructability report. NO BACKFILL.
 */
export async function GET() {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();

    const { data: reservations, error: resErr } = await sb
      .from("order_reservations")
      .select("id, shipping_revenue_gross_cents, status")
      .in("status", [...PALLET_FILL_STATUSES])
      .limit(5000);

    if (resErr) {
      return NextResponse.json({ error: resErr.message }, { status: 500 });
    }

    const ids = (reservations ?? []).map((r) => r.id as string);
    if (ids.length === 0) {
      return NextResponse.json({
        summary: summarizeHistoricalShippingAudit([]),
        sample: [],
        note: "NO BACKFILL EXECUTED",
      });
    }

    const { data: items, error: itemsErr } = await sb
      .from("order_reservation_items")
      .select("reservation_id, quantity, economics_snapshot")
      .in("reservation_id", ids);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const byRes = new Map<
      string,
      { bottles: number; ship: number; outbound: number }
    >();
    for (const i of items ?? []) {
      const rid = String(i.reservation_id);
      const qty = Math.max(0, Math.floor(Number(i.quantity) || 0));
      const snap = i.economics_snapshot as Record<string, unknown> | null;
      const cur = byRes.get(rid) ?? { bottles: 0, ship: 0, outbound: 0 };
      cur.bottles += qty;
      if (snap && typeof snap === "object") {
        cur.ship +=
          (Number(snap.unit_shipping_revenue_gross_cents) || 0) * qty;
        cur.outbound += (Number(snap.unit_last_mile_cost_cents) || 0) * qty;
      }
      byRes.set(rid, cur);
    }

    const rows = (reservations ?? []).map((r) => {
      const agg = byRes.get(r.id as string) ?? {
        bottles: 0,
        ship: 0,
        outbound: 0,
      };
      return classifyHistoricalShippingRow({
        reservationId: r.id as string,
        bottles: agg.bottles,
        snapshotShippingGrossCents: agg.ship,
        reservationShippingGrossCents:
          r.shipping_revenue_gross_cents == null
            ? null
            : Number(r.shipping_revenue_gross_cents),
        outboundCostCents: agg.outbound,
      });
    });

    return NextResponse.json({
      summary: summarizeHistoricalShippingAudit(rows),
      sample: rows.filter((r) => r.classification === "legacy_zero_ambiguous").slice(0, 25),
      note: "NO BACKFILL EXECUTED — read-only audit only",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
