import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Test producer creation to debug errors
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    const testData = {
      name: "Test Producer",
      region: "Test Region",
      lat: 43.4872992,
      lon: 2.7631484,
      country_code: "FR",
      address_street: "13 Route de Narbonne",
      address_city: "Saint-Pons-de-Thomières",
      address_postcode: "34220",
      short_description: "Test description",
      logo_image_path: "",
      pickup_zone_id: "ef9339ef-41bd-4859-b511-ef64611d2fbc",
      owner_id: null,
    };

    console.log("Testing producer creation with data:", testData);

    const { data: producer, error } = await supabase
      .from("producers")
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error("Producer creation error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    console.log("Producer created successfully:", producer);

    return NextResponse.json({
      success: true,
      producer,
    });

  } catch (error: any) {
    console.error("Test producer create error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

