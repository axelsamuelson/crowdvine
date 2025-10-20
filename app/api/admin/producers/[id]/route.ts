import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Update a producer
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const producerId = params.id;

    console.log("Updating producer:", producerId, body);

    const updateData: any = {};

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.region !== undefined) updateData.region = body.region;
    if (body.lat !== undefined) updateData.lat = body.lat;
    if (body.lon !== undefined) updateData.lon = body.lon;
    if (body.country_code !== undefined)
      updateData.country_code = body.country_code;
    if (body.address_street !== undefined)
      updateData.address_street = body.address_street;
    if (body.address_city !== undefined)
      updateData.address_city = body.address_city;
    if (body.address_postcode !== undefined)
      updateData.address_postcode = body.address_postcode;
    if (body.short_description !== undefined)
      updateData.short_description = body.short_description;
    if (body.logo_image_path !== undefined)
      updateData.logo_image_path = body.logo_image_path;
    if (body.pickup_zone_id !== undefined)
      updateData.pickup_zone_id = body.pickup_zone_id || null;

    const { data: producer, error } = await supabase
      .from("producers")
      .update(updateData)
      .eq("id", producerId)
      .select()
      .single();

    if (error) {
      console.error("Update producer error:", error);
      return NextResponse.json(
        {
          error: error.message,
          details: error,
          code: error.code,
        },
        { status: 500 },
      );
    }

    console.log("Producer updated:", producer.id);

    return NextResponse.json({ success: true, producer });
  } catch (error: any) {
    console.error("Producer update API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * Delete a producer
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = getSupabaseAdmin();
    const producerId = params.id;

    console.log("Deleting producer:", producerId);

    const { error } = await supabase
      .from("producers")
      .delete()
      .eq("id", producerId);

    if (error) {
      console.error("Delete producer error:", error);
      return NextResponse.json(
        {
          error: error.message,
          details: error,
        },
        { status: 500 },
      );
    }

    console.log("Producer deleted:", producerId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Producer delete API error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}
