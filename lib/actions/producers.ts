"use server";

import { supabaseServer } from "@/lib/supabase-server";
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
  const sb = await supabaseServer();

  const { data, error } = await sb.from("producers").select("*").order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getProducer(id: string) {
  const sb = await supabaseServer();

  const { data, error } = await sb
    .from("producers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProducer(data: CreateProducerData) {
  const sb = await supabaseServer();

  // Get current user to set as owner
  const { data: { user } } = await sb.auth.getUser();

  const { data: producer, error } = await sb
    .from("producers")
    .insert({
      ...data,
      owner_id: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Create producer error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/admin/producers");
  return producer;
}

export async function updateProducer(
  id: string,
  data: Partial<CreateProducerData>,
) {
  const sb = await supabaseServer();

  const { data: producer, error } = await sb
    .from("producers")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

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
