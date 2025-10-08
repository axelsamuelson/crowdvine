import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Show columns for key tables
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Try to get one row from each table to see structure
    const tables = {
      pallets: await supabase.from("pallets").select("*").limit(1).single(),
      order_reservations: await supabase.from("order_reservations").select("*").limit(1).single(),
      bookings: await supabase.from("bookings").select("*").limit(1).single(),
      producers: await supabase.from("producers").select("*").limit(1).single(),
      pallet_zones: await supabase.from("pallet_zones").select("*").limit(1).single(),
    };

    const result: any = {};
    
    for (const [tableName, query] of Object.entries(tables)) {
      if (query.data) {
        result[tableName] = {
          columns: Object.keys(query.data),
          sampleRow: query.data,
        };
      } else {
        result[tableName] = {
          error: query.error?.message || "No data",
        };
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Show tables error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

