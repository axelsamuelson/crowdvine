import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

type Dimension = "wine" | "producer";

function getSinceIso(timeRange: string | null): string | null {
  const tr = (timeRange || "30d").toLowerCase();
  if (tr === "all") return null;
  const days =
    tr === "7d" ? 7 : tr === "90d" ? 90 : tr === "30d" ? 30 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return since.toISOString();
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || "30d";
  const dimension = (searchParams.get("dimension") ||
    "wine") as Dimension;

  if (dimension !== "wine" && dimension !== "producer") {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const sinceIso = getSinceIso(timeRange);

  try {
    // Fetch the relevant events and aggregate in JS.
    // This is intentionally bounded to avoid huge payloads; we can move to SQL later if needed.
    let query = sb
      .from("user_events")
      .select("event_type, event_metadata, created_at")
      .in("event_type", ["product_list_viewed", "product_viewed"])
      .order("created_at", { ascending: false })
      .limit(5000);

    if (sinceIso) query = query.gte("created_at", sinceIso);

    const { data: events, error } = await query;
    if (error) throw error;

    type Row = {
      key: string;
      name: string;
      plpViews: number;
      pdpViews: number;
    };

    const rows = new Map<string, Row>();

    const ensure = (key: string, name: string) => {
      const existing = rows.get(key);
      if (existing) return existing;
      const row: Row = { key, name, plpViews: 0, pdpViews: 0 };
      rows.set(key, row);
      return row;
    };

    for (const e of events || []) {
      const md: any = e.event_metadata || {};

      if (e.event_type === "product_viewed") {
        if (dimension === "wine") {
          const productId = md.productId;
          const productName = md.productName || md.productHandle || "Unknown wine";
          if (typeof productId === "string" && productId) {
            ensure(productId, String(productName)).pdpViews += 1;
          }
        } else {
          const producerId = md.producerId;
          const producerName = md.producerName || "Unknown producer";
          if (typeof producerId === "string" && producerId) {
            ensure(producerId, String(producerName)).pdpViews += 1;
          }
        }
      }

      if (e.event_type === "product_list_viewed") {
        // We store productIds + producerIds arrays on newer events.
        if (dimension === "wine") {
          const productIds = Array.isArray(md.productIds) ? md.productIds : [];
          for (const productId of productIds) {
            if (typeof productId === "string" && productId) {
              // Name might be unknown for PLP-only impressions; we can fill it later from PDP events.
              ensure(productId, rows.get(productId)?.name || "Unknown wine").plpViews += 1;
            }
          }
        } else {
          const producerIds = Array.isArray(md.producerIds) ? md.producerIds : [];
          for (const producerId of producerIds) {
            if (typeof producerId === "string" && producerId) {
              ensure(
                producerId,
                rows.get(producerId)?.name || "Unknown producer",
              ).plpViews += 1;
            }
          }
        }
      }
    }

    const out = Array.from(rows.values()).filter(
      (r) => r.plpViews > 0 || r.pdpViews > 0,
    );

    // If we have PDP names, use them to backfill "Unknown ..." rows.
    // (Keeps UI cleaner until we fetch names from DB.)
    for (const r of out) {
      if (r.name.startsWith("Unknown ")) {
        // try to find any row with same key but better name (unlikely, but safe)
        const better = rows.get(r.key);
        if (better && !better.name.startsWith("Unknown ")) r.name = better.name;
      }
    }

    return NextResponse.json({
      dimension,
      timeRange,
      rows: out,
    });
  } catch (err) {
    console.error("Analytics views API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch views analytics" },
      { status: 500 },
    );
  }
}

