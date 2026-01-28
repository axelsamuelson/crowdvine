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
      // Business fields
      company_name,
      organization_number,
      vat_number,
      business_type,
      billing_address,
      billing_city,
      billing_postal_code,
      billing_country,
      contact_person,
      delivery_instructions,
      opening_hours,
      employee_count,
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
    
    // Business fields - convert empty strings to null
    if (company_name !== undefined) updatePayload.company_name = company_name || null;
    if (organization_number !== undefined) updatePayload.organization_number = organization_number || null;
    if (vat_number !== undefined) updatePayload.vat_number = vat_number || null;
    if (business_type !== undefined) updatePayload.business_type = business_type || null;
    if (billing_address !== undefined) updatePayload.billing_address = billing_address || null;
    if (billing_city !== undefined) updatePayload.billing_city = billing_city || null;
    if (billing_postal_code !== undefined) updatePayload.billing_postal_code = billing_postal_code || null;
    if (billing_country !== undefined) updatePayload.billing_country = billing_country || null;
    if (contact_person !== undefined) updatePayload.contact_person = contact_person || null;
    if (delivery_instructions !== undefined) updatePayload.delivery_instructions = delivery_instructions || null;
    if (opening_hours !== undefined) updatePayload.opening_hours = opening_hours || null;
    if (employee_count !== undefined) {
      // Convert empty string or 0 to null, otherwise parse as integer
      const count = employee_count === "" || employee_count === 0 ? null : parseInt(String(employee_count), 10);
      updatePayload.employee_count = isNaN(count as number) ? null : count;
    }

    console.log("=== PROFILE UPDATE ===");
    console.log("User ID:", user.id);
    console.log("Update payload:", JSON.stringify(updatePayload, null, 2));

    // Filter out undefined values to avoid issues
    const cleanPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
    );

    console.log("Clean payload:", JSON.stringify(cleanPayload, null, 2));

    const { data, error } = await sb
      .from("profiles")
      .update(cleanPayload)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("=== PROFILE UPDATE ERROR ===");
      console.error("Error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);
      console.error("===========================");
      throw error;
    }

    console.log("Profile updated successfully");
    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { 
        error: "Failed to update profile",
        details: error?.message || error?.details || "Unknown error",
        code: error?.code
      },
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
