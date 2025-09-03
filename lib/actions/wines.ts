'use server';

import { supabaseServer } from '@/lib/supabase-server';
import { supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export interface Wine {
  id: string;
  handle: string;
  wine_name: string;
  vintage: string;
  grape_varieties?: string;
  color?: string;
  label_image_path?: string;
  base_price_cents: number;
  producer_id: string;
  producer?: {
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateWineData {
  handle: string;
  wine_name: string;
  vintage: string;
  grape_varieties?: string;
  color?: string;
  label_image_path?: string;
  base_price_cents: number;
  producer_id: string;
}

export async function getWines() {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('wines')
    .select(`
      *,
      producer:producers(name)
    `)
    .order('wine_name');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getWine(id: string) {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('wines')
    .select(`
      *,
      producer:producers(name)
    `)
    .eq('id', id)
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}

export async function createWine(data: CreateWineData) {
  const sb = await supabaseServer();
  
  const { data: wine, error } = await sb
    .from('wines')
    .insert(data)
    .select(`
      *,
      producer:producers(name)
    `)
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/wines');
  return wine;
}

export async function updateWine(id: string, data: Partial<CreateWineData>) {
  const sb = await supabaseServer();
  
  const { data: wine, error } = await sb
    .from('wines')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      producer:producers(name)
    `)
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/wines');
  revalidatePath(`/admin/wines/${id}`);
  return wine;
}

export async function deleteWine(id: string) {
  const sb = await supabaseServer();
  
  const { error } = await sb
    .from('wines')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/wines');
}
