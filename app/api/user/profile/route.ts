import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/user/profile
 *
 * Returns current user's profile information
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Get profile data
    const { data: profile, error } = await sb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({
      profile: profile || {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/user/profile
 *
 * Update user profile
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const body = await request.json();

    const {
      full_name,
      phone,
      address,
      city,
      postal_code,
      country,
      description,
      avatar_image_path,
      cover_image_path,
    } = body;

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updatePayload.full_name = full_name;
    if (phone !== undefined) updatePayload.phone = phone;
    if (address !== undefined) updatePayload.address = address;
    if (city !== undefined) updatePayload.city = city;
    if (postal_code !== undefined) updatePayload.postal_code = postal_code;
    if (country !== undefined) updatePayload.country = country;
    if (description !== undefined) updatePayload.description = description;
    if (avatar_image_path !== undefined)
      updatePayload.avatar_image_path = avatar_image_path;
    if (cover_image_path !== undefined)
      updatePayload.cover_image_path = cover_image_path;

    const { data, error } = await sb
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/user/profile
 *
 * Update user profile (alias for PUT)
 */
export async function PATCH(request: Request) {
  return PUT(request);
}
