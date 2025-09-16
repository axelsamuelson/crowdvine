"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

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
  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("site_content")
    .select("*")
    .order("key");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSiteContentByKey(key: string): Promise<string | null> {
  try {
    const sb = await supabaseServer();

    const { data, error } = await sb
      .from("site_content")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      console.warn(`Site content not found for key: ${key}`, error);
      return null;
    }
    return data?.value || null;
  } catch (error) {
    console.error(`Error fetching site content for key: ${key}`, error);
    return null;
  }
}

export async function updateSiteContent(
  key: string,
  value: string,
): Promise<void> {
  const sb = await supabaseServer();

  // First try to update existing record
  const { data: existingData, error: selectError } = await sb
    .from("site_content")
    .select("id")
    .eq("key", key)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
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

  revalidatePath("/admin/content");
  revalidatePath("/"); // Revalidate homepage
}
