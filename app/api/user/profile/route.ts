import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    
    // Get user profile from profiles table
    // Only select columns that exist (graceful fallback for missing columns)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    return NextResponse.json(profile);

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();
    const supabase = getSupabaseAdmin();

    // Filter out non-existent columns to prevent errors
    const allowedColumns = ['email', 'role', 'full_name', 'phone', 'address', 'city', 'postal_code', 'country'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedColumns.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);

    // Update user profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Update profile API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
