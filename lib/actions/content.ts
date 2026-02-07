"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { getSiteUrl } from "@/lib/app-url";

export interface SiteContent {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export async function getSiteContent(): Promise<SiteContent[]> {
  const sb = getSupabaseAdmin(); // Use admin client to bypass RLS

  const { data, error } = await sb
    .from("site_content")
    .select("*")
    .order("key");

  if (error) throw new Error(error.message);

  // Supabase Storage URLs are already full URLs, no conversion needed
  const processedData = data || [];

  return processedData;
}

export async function getSiteContentByKey(key: string): Promise<string | null> {
  try {
    const sb = getSupabaseAdmin(); // Use admin client to bypass RLS

    const { data, error } = await sb
      .from("site_content")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      console.warn(`Site content not found for key: ${key}`, error);
      return null;
    }

    const value = data?.value || null;

    // Supabase Storage URLs are already full URLs, no conversion needed
    return value;
  } catch (error) {
    console.error(`Error fetching site content for key: ${key}`, error);
    return null;
  }
}

export async function updateSiteContent(
  key: string,
  value: string,
): Promise<void> {
  const sb = getSupabaseAdmin(); // Use admin client to bypass RLS

  // First try to update existing record
  const { data: existingData, error: selectError } = await sb
    .from("site_content")
    .select("id")
    .eq("key", key)
    .single();

  if (selectError && selectError.code !== "PGRST116") {
    throw new Error(selectError.message);
  }

  if (existingData) {
    // Update existing record
    const { error: updateError } = await sb
      .from("site_content")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (updateError) throw new Error(updateError.message);
  } else {
    // Insert new record
    const { error: insertError } = await sb
      .from("site_content")
      .insert({ key, value, updated_at: new Date().toISOString() });

    if (insertError) throw new Error(insertError.message);
  }

  // Revalidate relevant paths
  revalidatePath("/admin/content");
  revalidatePath("/"); // Revalidate homepage
  
  // För logo-nycklar, revalidate alla paths som kan visa loggan
  const logoKeys = ["header_logo", "footer_logo", "alternative_logo", "header_logo_pact", "footer_logo_pact", "alternative_logo_pact", "header_logo_dirtywine", "footer_logo_dirtywine", "alternative_logo_dirtywine"];
  if (logoKeys.includes(key)) {
    revalidatePath("/", "layout"); // Revalidate root layout
    // Force revalidation av API-routes
    try {
      await fetch(`${getSiteUrl()}/api/site-content/${key}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });
    } catch (e) {
      // Ignore errors in revalidation fetch
    }
  }
}
