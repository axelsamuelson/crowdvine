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

    // Fetch actual names from database for wines
    if (dimension === "wine") {
      const wineKeys = out.map(r => r.key).filter(id => id && !id.startsWith("Unknown"));
      if (wineKeys.length > 0) {
        try {
          // Try to fetch by ID first (UUIDs)
          const uuidKeys = wineKeys.filter(k => k.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
          const handleKeys = wineKeys.filter(k => !k.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
          
          const winesMap = new Map<string, { wineName: string; vintage: string; producerName: string }>();
          
          // Fetch wines by ID
          if (uuidKeys.length > 0) {
            const { data: winesById, error: winesError } = await sb
              .from("wines")
              .select("id, wine_name, vintage, producer_id, producers(name)")
              .in("id", uuidKeys);
            
            if (!winesError && winesById) {
              winesById.forEach((w: any) => {
                winesMap.set(w.id, {
                  wineName: w.wine_name,
                  vintage: w.vintage,
                  producerName: w.producers?.name || "Unknown producer"
                });
              });
            }
          }
          
          // Fetch wines by handle
          if (handleKeys.length > 0) {
            const { data: winesByHandle, error: handlesError } = await sb
              .from("wines")
              .select("id, handle, wine_name, vintage, producer_id, producers(name)")
              .in("handle", handleKeys);
            
            if (!handlesError && winesByHandle) {
              winesByHandle.forEach((w: any) => {
                winesMap.set(w.handle, {
                  wineName: w.wine_name,
                  vintage: w.vintage,
                  producerName: w.producers?.name || "Unknown producer"
                });
                // Also map by ID in case the key was stored as handle but we need ID lookup
                winesMap.set(w.id, {
                  wineName: w.wine_name,
                  vintage: w.vintage,
                  producerName: w.producers?.name || "Unknown producer"
                });
              });
            }
          }

          // Update row names with actual wine and producer names
          for (const r of out) {
            const wineInfo = winesMap.get(r.key);
            if (wineInfo) {
              r.name = `${wineInfo.wineName} ${wineInfo.vintage} (${wineInfo.producerName})`;
            } else if (r.name.startsWith("Unknown ")) {
              // Keep unknown if we couldn't find it in DB
              r.name = r.name;
            }
          }
        } catch (err) {
          console.error("Error fetching wine names:", err);
        }
      }
    } else if (dimension === "producer") {
      // Fetch producer names from database
      const producerIds = out.map(r => r.key).filter(id => id && !id.startsWith("Unknown"));
      if (producerIds.length > 0) {
        try {
          const { data: producers, error: producersError } = await sb
            .from("producers")
            .select("id, name")
            .in("id", producerIds);
          
          if (!producersError && producers) {
            const producersMap = new Map(producers.map((p: any) => [p.id, p.name]));

            // Update row names with actual producer names
            for (const r of out) {
              const producerName = producersMap.get(r.key);
              if (producerName) {
                r.name = producerName;
              }
            }
          }
        } catch (err) {
          console.error("Error fetching producer names:", err);
        }
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

