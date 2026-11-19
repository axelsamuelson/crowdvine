import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";
import {
  applyCleanFactsFilters,
  fetchStatusLine,
} from "@/lib/analytics/v2/queries";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ProductAgg = {
  product_id: string;
  product_name: string | null;
  list_sessions: number;
  pdp_sessions: number;
  cart_sessions: number;
  checkout_sessions: number;
  purchase_sessions: number;
};

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filters = parseAnalyticsV2Filters(request.nextUrl.searchParams);
  const status = await fetchStatusLine(filters);
  const sb = getSupabaseAdmin();

  const byId = new Map<string, ProductAgg>();

  // Product daily has no invited dimension; when exclude is set, use facts.
  if (filters.invited === "exclude") {
    const { data: factRows } = await applyCleanFactsFilters(
      sb
        .from("analytics_session_facts")
        .select(
          "product_ids_viewed, product_ids_added, reached_pdp, added_to_cart, reached_checkout, purchased",
        ),
      filters,
    ).limit(5000);

    for (const row of factRows ?? []) {
      const viewed = (row.product_ids_viewed as string[]) || [];
      const added = (row.product_ids_added as string[]) || [];
      const ids = new Set([...viewed, ...added]);
      for (const id of ids) {
        const cur = byId.get(id) || {
          product_id: id,
          product_name: null,
          list_sessions: 0,
          pdp_sessions: 0,
          cart_sessions: 0,
          checkout_sessions: 0,
          purchase_sessions: 0,
        };
        if (row.reached_pdp && viewed.includes(id)) cur.pdp_sessions += 1;
        if (row.added_to_cart && added.includes(id)) cur.cart_sessions += 1;
        if (row.reached_checkout) cur.checkout_sessions += 1;
        if (row.purchased) cur.purchase_sessions += 1;
        byId.set(id, cur);
      }
    }
  } else {
    const { data, error } = await sb
      .from("analytics_product_daily")
      .select(
        "product_id, product_name, list_sessions, pdp_sessions, cart_sessions, checkout_sessions, purchase_sessions",
      )
      .eq("site", filters.site)
      .gte("day_sthlm", filters.from)
      .lte("day_sthlm", filters.to)
      .limit(2000);

    if (error) {
      return NextResponse.json(
        { error: "Kunde inte hämta produkter" },
        { status: 500 },
      );
    }

    for (const row of data ?? []) {
      const id = String(row.product_id);
      const cur = byId.get(id) || {
        product_id: id,
        product_name: row.product_name as string | null,
        list_sessions: 0,
        pdp_sessions: 0,
        cart_sessions: 0,
        checkout_sessions: 0,
        purchase_sessions: 0,
      };
      cur.list_sessions += Number(row.list_sessions || 0);
      cur.pdp_sessions += Number(row.pdp_sessions || 0);
      cur.cart_sessions += Number(row.cart_sessions || 0);
      cur.checkout_sessions += Number(row.checkout_sessions || 0);
      cur.purchase_sessions += Number(row.purchase_sessions || 0);
      byId.set(id, cur);
    }
  }

  const wines = [...byId.values()].sort((a, b) => {
    const rateA = a.pdp_sessions ? a.cart_sessions / a.pdp_sessions : 1;
    const rateB = b.pdp_sessions ? b.cart_sessions / b.pdp_sessions : 1;
    if (b.pdp_sessions !== a.pdp_sessions) return b.pdp_sessions - a.pdp_sessions;
    return rateA - rateB;
  });

  const { data: listRows } = await applyCleanFactsFilters(
    sb.from("analytics_session_facts").select("landing_path"),
    filters,
  )
    .eq("reached_plp", true)
    .limit(2000);

  const lists = new Map<string, number>();
  for (const row of listRows ?? []) {
    const path = (row.landing_path as string) || "/";
    lists.set(path, (lists.get(path) || 0) + 1);
  }

  return NextResponse.json({
    status,
    wines: wines.slice(0, 50),
    lists: [...lists.entries()]
      .map(([path, sessions]) => ({ path, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 20),
  });
}
