import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface PalletZone {
  id: string;
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
  zone_type: "delivery" | "pickup";
}

export interface Pallet {
  id: string;
  name: string;
  description?: string;
  status?: string | null;
  status_mode?: string | null;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  min_bottles_to_complete?: number;
  freight_target_cents?: number | null;
  last_mile_cost_cents_per_bottle?: number | null;
  shipping_ordered_at?: string | null;
  created_at: string;
  updated_at: string;
  delivery_zone?: PalletZone;
  pickup_zone?: PalletZone;
  shipping_region?: { id?: string; name?: string | null } | null;
  current_pickup_producer?: { id?: string; name?: string | null } | null;
}

export interface CreatePalletData {
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  min_bottles_to_complete?: number;
}

export async function getPallets(): Promise<Pallet[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("pallets")
    .select(
      `
      *,
      delivery_zone:pallet_zones!delivery_zone_id(id, name, zone_type),
      pickup_zone:pallet_zones!pickup_zone_id(id, name, zone_type)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch pallets: ${error.message}`);
  return data || [];
}

export async function getPallet(id: string): Promise<Pallet | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("pallets")
    .select(
      `
      *,
      delivery_zone:pallet_zones!delivery_zone_id(id, name, zone_type),
      pickup_zone:pallet_zones!pickup_zone_id(id, name, zone_type),
      shipping_region:shipping_regions(id, name),
      current_pickup_producer:producers!current_pickup_producer_id(id, name)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch pallet: ${error.message}`);
  return data;
}

export async function createPallet(data: CreatePalletData): Promise<Pallet> {
  const sb = getSupabaseAdmin();
  const { data: pallet, error } = await sb
    .from("pallets")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create pallet: ${error.message}`);
  return pallet;
}

export async function updatePallet(
  id: string,
  data: Partial<CreatePalletData>,
): Promise<Pallet> {
  const sb = getSupabaseAdmin();
  const { data: pallet, error } = await sb
    .from("pallets")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update pallet: ${error.message}`);
  return pallet;
}

export async function deletePallet(id: string): Promise<void> {
  const sb = getSupabaseAdmin();

  const { data: activeReservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id")
    .eq("pallet_id", id)
    .not("status", "in", '("cancelled","rejected")')
    .limit(1);

  if (reservationsError) {
    throw new Error(
      `Failed to check reservations: ${reservationsError.message}`,
    );
  }

  if (activeReservations && activeReservations.length > 0) {
    throw new Error(
      `Cannot delete pallet: It has active reservation(s) on this pallet. Cancel or resolve them first.`,
    );
  }

  // If no dependencies, proceed with deletion
  const { error } = await sb.from("pallets").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete pallet: ${error.message}`);
}
