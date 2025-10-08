"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export interface GrapeVariety {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WineColor {
  id: string;
  name: string;
  hex_color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WineWithDetails {
  id: string;
  wine_name: string;
  vintage: number;
  grape_varieties: string[];
  color_name: string | null;
  color_hex: string | null;
  producer_name: string | null;
  base_price_cents: number;
  calculated_price_cents: number;
  handle: string;
  label_image_path: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Grape Varieties
export async function getGrapeVarieties(): Promise<GrapeVariety[]> {
  // Use admin client for admin operations
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("grape_varieties")
    .select("*")
    .order("name");

  if (error) {
    console.error("Get grape varieties error:", error);
    throw new Error(error.message);
  }
  return data || [];
}

export async function createGrapeVariety(data: {
  name: string;
  description?: string;
}): Promise<GrapeVariety> {
  // Use admin client for admin operations
  const sb = getSupabaseAdmin();

  console.log("🍇 Creating grape variety:", data.name);

  const { data: variety, error } = await sb
    .from("grape_varieties")
    .insert({ name: data.name, description: data.description || "" })
    .select()
    .single();

  if (error) {
    console.error("❌ Create grape variety error:", error);
    throw new Error(error.message);
  }

  console.log("✅ Grape variety created:", variety.id);

  revalidatePath("/admin/grape-varieties");
  revalidatePath("/admin/wines");
  return variety;
}

export async function updateGrapeVariety(
  id: string,
  name: string,
  description?: string,
): Promise<GrapeVariety> {
  // Use admin client for admin operations
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("grape_varieties")
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update grape variety error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/grape-varieties");
  return data;
}

export async function deleteGrapeVariety(id: string): Promise<void> {
  // Use admin client for admin operations
  const sb = getSupabaseAdmin();

  const { error } = await sb.from("grape_varieties").delete().eq("id", id);

  if (error) {
    console.error("Delete grape variety error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/grape-varieties");
}

// Wine Colors
export async function getWineColors(): Promise<WineColor[]> {
  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("wine_colors")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createWineColor(
  name: string,
  hex_color: string,
  description?: string,
): Promise<WineColor> {
  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("wine_colors")
    .insert({ name, hex_color, description })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/wine-colors");
  return data;
}

export async function updateWineColor(
  id: string,
  name: string,
  hex_color: string,
  description?: string,
): Promise<WineColor> {
  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("wine_colors")
    .update({
      name,
      hex_color,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/wine-colors");
  return data;
}

export async function deleteWineColor(id: string): Promise<void> {
  const sb = await supabaseServer();

  const { error } = await sb.from("wine_colors").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/wine-colors");
}

// Wine Grape Varieties (Junction table)
export async function getWineGrapeVarieties(wineId: string): Promise<string[]> {
  // Use admin client for admin operations
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("wine_grape_varieties")
    .select("grape_variety_id")
    .eq("wine_id", wineId);

  if (error) {
    console.error("Get wine grape varieties error:", error);
    throw new Error(error.message);
  }
  return data?.map((item) => item.grape_variety_id) || [];
}

export async function updateWineGrapeVarieties(
  wineId: string,
  grapeVarietyIds: string[],
): Promise<void> {
  // Use admin client for admin operations
  const sb = getSupabaseAdmin();

  console.log("🍇 Updating wine grape varieties for wine:", wineId, "varieties:", grapeVarietyIds);

  // Delete existing associations
  const { error: deleteError } = await sb
    .from("wine_grape_varieties")
    .delete()
    .eq("wine_id", wineId);

  if (deleteError) {
    console.error("Delete wine grape varieties error:", deleteError);
    throw new Error(deleteError.message);
  }

  // Insert new associations
  if (grapeVarietyIds.length > 0) {
    const associations = grapeVarietyIds.map((grapeVarietyId) => ({
      wine_id: wineId,
      grape_variety_id: grapeVarietyId,
    }));

    const { error: insertError } = await sb
      .from("wine_grape_varieties")
      .insert(associations);

    if (insertError) {
      console.error("Insert wine grape varieties error:", insertError);
      throw new Error(insertError.message);
    }
  }

  console.log("✅ Wine grape varieties updated");

  revalidatePath("/admin/wines");
  revalidatePath(`/admin/wines/${wineId}`);
}

// Enhanced wine functions using the new structure
export async function getWineWithDetails(
  wineId: string,
): Promise<WineWithDetails | null> {
  const sb = await supabaseServer();

  const { data, error } = await sb.rpc("get_wine_with_details", {
    wine_id: wineId,
  });

  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

export async function getAllWinesWithDetails(): Promise<WineWithDetails[]> {
  const sb = await supabaseServer();

  const { data, error } = await sb.rpc("get_all_wines_with_details");

  if (error) throw new Error(error.message);
  return data || [];
}
