"use server";

import { requireAdmin } from "@/lib/admin-auth-server";
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("pallet_zones")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getPalletZone(id: string) {
  await requireAdmin();
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
  await requireAdmin();
  const { createPickupZoneCore } = await import("@/lib/admin/lager-frakt-writes");
  const sb = getSupabaseAdmin();
  if (data.zone_type === "pickup") {
    return createPickupZoneCore(sb, data);
  }
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
  await requireAdmin();
  const sb = getSupabaseAdmin();
  if (data.zone_type === "pickup" || data.zone_type === undefined) {
    const { data: existing } = await sb
      .from("pallet_zones")
      .select("zone_type")
      .eq("id", id)
      .maybeSingle();
    if (existing?.zone_type === "pickup") {
      const { updatePickupZoneCore } = await import(
        "@/lib/admin/lager-frakt-writes"
      );
      return updatePickupZoneCore(sb, id, data);
    }
  }
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
  await requireAdmin();
  const { deletePalletZoneCore } = await import("@/lib/admin/lager-frakt-writes");
  await deletePalletZoneCore(getSupabaseAdmin(), id);
}
