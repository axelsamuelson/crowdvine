import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/auth";
import {
  INVALID_PRODUCER_COUNTRY_MESSAGE,
  normalizeCountryCode,
} from "@/lib/countries";

const updatableProducerFields = [
  "name",
  "region",
  "lat",
  "lon",
  "country_code",
  "address_street",
  "address_city",
  "address_postcode",
  "short_description",
  "logo_image_path",
  "pickup_zone_id",
  "moq_min_bottles",
] as const;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "producer" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.producer_id) {
      return NextResponse.json(
        { error: "No producer linked to this account" },
        { status: 400 },
      );
    }

    const sb = await supabaseServer();
    const { data: producer, error } = await sb
      .from("producers")
      .select("*")
      .eq("id", user.producer_id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ producer });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "producer" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.producer_id) {
      return NextResponse.json(
        { error: "No producer linked to this account" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updateData: Record<string, any> = {};
    for (const key of updatableProducerFields) {
      if (key === "country_code") continue;
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }
    if (body.country_code !== undefined) {
      const countryCode = normalizeCountryCode(body.country_code);
      if (!countryCode) {
        return NextResponse.json(
          { error: INVALID_PRODUCER_COUNTRY_MESSAGE },
          { status: 400 },
        );
      }
      updateData.country_code = countryCode;
    }

    const sb = await supabaseServer();
    const { data: producer, error } = await sb
      .from("producers")
      .update(updateData)
      .eq("id", user.producer_id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, producer });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}


