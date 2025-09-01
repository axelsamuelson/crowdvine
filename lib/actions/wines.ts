'use server';

import { requireAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export interface Wine {
  id: string;
  handle: string;
  wine_name: string;
  vintage: string;
  grape_varieties: string;
  color: string;
  label_image_path: string;
  base_price_cents: number;
  campaign_id: string;
  campaign?: {
    title: string;
  };
}

export interface CreateWineData {
  handle: string;
  wine_name: string;
  vintage: string;
  grape_varieties: string;
  color: string;
  label_image_path: string;
  base_price_cents: number;
  campaign_id: string;
}

export async function getWines() {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('campaign_items')
    .select(`
      *,
      campaign:campaigns(title)
    `)
    .order('wine_name');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getWine(id: string) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('campaign_items')
    .select(`
      *,
      campaign:campaigns(title)
    `)
    .eq('id', id)
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}

export async function createWine(data: CreateWineData) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data: wine, error } = await sb
    .from('campaign_items')
    .insert(data)
    .select(`
      *,
      campaign:campaigns(title)
    `)
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/wines');
  return wine;
}

export async function updateWine(id: string, data: Partial<CreateWineData>) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data: wine, error } = await sb
    .from('campaign_items')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      campaign:campaigns(title)
    `)
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/wines');
  revalidatePath(`/admin/wines/${id}`);
  return wine;
}

export async function deleteWine(id: string) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { error } = await sb
    .from('campaign_items')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/wines');
}
