"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export interface PalletZone {
  id: string;
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
  zone_type: "delivery" | "pickup";
}

export interface CreatePalletZoneData {
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
  zone_type: "delivery" | "pickup";
}

export async function getDeliveryZones() {
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("pallet_zones")
    .select("*")
    .eq("zone_type", "delivery")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getPickupZones() {
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("pallet_zones")
    .select("*")
    .eq("zone_type", "pickup")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getPalletZones() {
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("pallet_zones")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getPalletZone(id: string) {
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("pallet_zones")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createPalletZone(data: CreatePalletZoneData) {
  const sb = getSupabaseAdmin();

  const { data: zone, error } = await sb
    .from("pallet_zones")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/zones");
  return zone;
}

export async function updatePalletZone(
  id: string,
  data: Partial<CreatePalletZoneData>,
) {
  const sb = getSupabaseAdmin();

  const { data: zone, error } = await sb
    .from("pallet_zones")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/zones");
  revalidatePath(`/admin/zones/${id}`);
  return zone;
}

export async function deletePalletZone(id: string) {
  const sb = getSupabaseAdmin();

  // Check if zone is used in any producers before deleting
  const { data: producers, error: producersError } = await sb
    .from("producers")
    .select("id, name")
    .eq("pickup_zone_id", id)
    .limit(5); // Get up to 5 producers for more detailed error message

  if (producersError) {
    throw new Error(`Failed to check producer usage: ${producersError.message}`);
  }

  if (producers && producers.length > 0) {
    const producerDetails = producers.map(p => `"${p.name}" (${p.id.substring(0, 8)}...)`).join(', ');
    
    throw new Error(`Cannot delete zone: This zone is currently used by ${producers.length} producer(s): ${producerDetails}. You must first reassign these producers to different zones before deleting this zone.`);
  }

  // Check if zone is used in any reservations before deleting
  const { data: reservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id, status, created_at")
    .or(`pickup_zone_id.eq.${id},delivery_zone_id.eq.${id}`)
    .limit(5); // Get up to 5 reservations for more detailed error message

  if (reservationsError) {
    throw new Error(`Failed to check zone usage: ${reservationsError.message}`);
  }

  if (reservations && reservations.length > 0) {
    const reservationDetails = reservations.map(r => 
      `Reservation ${r.id.substring(0, 8)}... (${r.status}, created ${new Date(r.created_at).toLocaleDateString()})`
    ).join(', ');
    
    throw new Error(`Cannot delete zone: This zone is currently used in ${reservations.length} existing reservation(s): ${reservationDetails}. You must first reassign or cancel these reservations before deleting the zone.`);
  }

  // Check if zone is used in any pallets before deleting
  const { data: pallets, error: palletsError } = await sb
    .from("pallets")
    .select("id, name")
    .or(`pickup_zone_id.eq.${id},delivery_zone_id.eq.${id}`)
    .limit(5); // Get up to 5 pallets for more detailed error message

  if (palletsError) {
    throw new Error(`Failed to check pallet usage: ${palletsError.message}`);
  }

  if (pallets && pallets.length > 0) {
    const palletDetails = pallets.map(p => `"${p.name}" (${p.id.substring(0, 8)}...)`).join(', ');
    
    throw new Error(`Cannot delete zone: This zone is currently used in ${pallets.length} existing pallet(s): ${palletDetails}. You must first remove or reassign these pallets before deleting the zone.`);
  }

  const { error } = await sb.from("pallet_zones").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/zones");
}
