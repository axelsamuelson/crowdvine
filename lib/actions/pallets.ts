import { supabaseServer } from "@/lib/supabase-server";

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
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  created_at: string;
  updated_at: string;
  delivery_zone?: PalletZone;
  pickup_zone?: PalletZone;
}

export interface CreatePalletData {
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
}

export async function getPallets(): Promise<Pallet[]> {
  const sb = await supabaseServer();
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
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("pallets")
    .select(
      `
      *,
      delivery_zone:pallet_zones!delivery_zone_id(id, name, zone_type),
      pickup_zone:pallet_zones!pickup_zone_id(id, name, zone_type)
    `,
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch pallet: ${error.message}`);
  return data;
}

export async function createPallet(data: CreatePalletData): Promise<Pallet> {
  const sb = await supabaseServer();
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
  const sb = await supabaseServer();
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
  const sb = await supabaseServer();
  
  // First check if there are any bookings/reservations for this pallet
  const { data: bookings, error: bookingsError } = await sb
    .from("bookings")
    .select("id")
    .eq("pallet_id", id)
    .limit(1);

  if (bookingsError) {
    throw new Error(`Failed to check bookings: ${bookingsError.message}`);
  }

  if (bookings && bookings.length > 0) {
    throw new Error(`Cannot delete pallet: It has ${bookings.length} associated booking(s). Please remove all bookings first.`);
  }

  // Check reservations as well
  const { data: reservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id")
    .eq("pallet_id", id)
    .limit(1);

  if (reservationsError) {
    throw new Error(`Failed to check reservations: ${reservationsError.message}`);
  }

  if (reservations && reservations.length > 0) {
    throw new Error(`Cannot delete pallet: It has ${reservations.length} associated reservation(s). Please remove all reservations first.`);
  }

  // If no dependencies, proceed with deletion
  const { error } = await sb.from("pallets").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete pallet: ${error.message}`);
}
