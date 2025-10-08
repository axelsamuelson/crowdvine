"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export interface Producer {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  country_code: string;
  address_street: string;
  address_city: string;
  address_postcode: string;
  short_description: string;
  logo_image_path: string;
  pickup_zone_id?: string;
}

export interface CreateProducerData {
  name: string;
  region: string;
  lat: number;
  lon: number;
  country_code: string;
  address_street: string;
  address_city: string;
  address_postcode: string;
  short_description: string;
  logo_image_path: string;
  pickup_zone_id?: string;
}

export async function getProducers() {
  // Use admin client for read operations in admin
  const sb = getSupabaseAdmin();

  const { data, error } = await sb.from("producers").select("*").order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getProducer(id: string) {
  // Use admin client for read operations in admin
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("producers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProducer(data: CreateProducerData) {
  // Use admin client for admin operations
  const sb = getSupabaseAdmin();

  // Get current user to set as owner (from regular client)
  const userSb = await supabaseServer();
  const { data: { user } } = await userSb.auth.getUser();

  console.log("Creating producer with data:", data, "owner:", user?.id);

  const { data: producer, error } = await sb
    .from("producers")
    .insert({
      ...data,
      owner_id: user?.id || null,
      status: 'active', // Set default status
    })
    .select()
    .single();

  if (error) {
    console.error("Create producer error:", error);
    throw new Error(error.message);
  }

  console.log("Producer created successfully:", producer.id);

  revalidatePath("/admin/producers");
  return producer;
}

export async function updateProducer(
  id: string,
  data: Partial<CreateProducerData>,
) {
  // Use admin client for admin operations
  const sb = getSupabaseAdmin();

  console.log('🔄 Updating producer:', id, data);

  const { data: producer, error } = await sb
    .from("producers")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error('❌ Update producer error:', error);
    throw new Error(error.message);
  }

  console.log('✅ Producer updated:', producer);

  revalidatePath("/admin/producers");
  revalidatePath(`/admin/producers/${id}`);
  return producer;
}

export async function deleteProducer(id: string) {
  const sb = await supabaseServer();

  const { error } = await sb.from("producers").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/producers");
}
