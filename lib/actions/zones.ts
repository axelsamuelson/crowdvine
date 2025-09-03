'use server';

import { supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export interface PalletZone {
  id: string;
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
  zone_type: 'delivery' | 'pickup';
}

export interface CreatePalletZoneData {
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
  zone_type: 'delivery' | 'pickup';
}

export async function getDeliveryZones() {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('pallet_zones')
    .select('*')
    .eq('zone_type', 'delivery')
    .order('name');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getPickupZones() {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('pallet_zones')
    .select('*')
    .eq('zone_type', 'pickup')
    .order('name');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getPalletZones() {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('pallet_zones')
    .select('*')
    .order('name');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getPalletZone(id: string) {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('pallet_zones')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}

export async function createPalletZone(data: CreatePalletZoneData) {
  const sb = await supabaseServer();
  
  const { data: zone, error } = await sb
    .from('pallet_zones')
    .insert(data)
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/zones');
  return zone;
}

export async function updatePalletZone(id: string, data: Partial<CreatePalletZoneData>) {
  const sb = await supabaseServer();
  
  const { data: zone, error } = await sb
    .from('pallet_zones')
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/zones');
  revalidatePath(`/admin/zones/${id}`);
  return zone;
}

export async function deletePalletZone(id: string) {
  const sb = await supabaseServer();
  
  const { error } = await sb
    .from('pallet_zones')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/zones');
}
