import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Get all producers
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: producers, error } = await supabase
      .from("producers")
      .select("id, name, region, country_code")
      .order("name");

    if (error) {
      console.error("Get producers error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ producers: producers || [] });
  } catch (error: any) {
    console.error("Get producers API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * Create a new producer
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    console.log("Creating producer with data:", body);

    // Validate required fields
    if (!body.name || !body.region) {
      return NextResponse.json(
        { error: "Name and region are required" },
        { status: 400 },
      );
    }

    const { data: producer, error } = await supabase
      .from("producers")
      .insert({
        name: body.name,
        region: body.region,
        lat: body.lat || 0,
        lon: body.lon || 0,
        country_code: body.country_code || "",
        address_street: body.address_street || "",
        address_city: body.address_city || "",
        address_postcode: body.address_postcode || "",
        short_description: body.short_description || "",
        logo_image_path: body.logo_image_path || "",
        pickup_zone_id: body.pickup_zone_id || null,
        owner_id: null, // Set by admin
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Create producer error:", error);
      return NextResponse.json(
        {
          error: error.message,
          details: error,
          code: error.code,
        },
        { status: 500 },
      );
    }

    console.log("Producer created:", producer.id);

    return NextResponse.json({ success: true, producer });
  } catch (error: any) {
    console.error("Producer API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}
