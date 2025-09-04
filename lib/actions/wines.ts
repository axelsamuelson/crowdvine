'use server';

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
  // New pricing fields
  cost_currency: string;
  cost_amount: number;
  exchange_rate_source: string;
  exchange_rate_date?: string;
  exchange_rate_period_start?: string;
  exchange_rate_period_end?: string;
  exchange_rate?: number;
  alcohol_tax_cents: number;
  price_includes_vat: boolean;
  margin_percentage: number;
  calculated_price_cents: number;
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
  // New pricing fields
  cost_currency: string;
  cost_amount: number;
  exchange_rate_source: string;
  exchange_rate_date?: string;
  exchange_rate_period_start?: string;
  exchange_rate_period_end?: string;
  exchange_rate?: number;
  alcohol_tax_cents: number;
  price_includes_vat: boolean;
  margin_percentage: number;
}

export async function getWines() {
  const sb = await supabaseServer();
  
  // Get all wines
  const { data: wines, error } = await sb
    .from('wines')
    .select(`
      id,
      handle,
      wine_name,
      vintage,
      grape_varieties,
      color,
      label_image_path,
      base_price_cents,
      producer_id,
      cost_currency,
      cost_amount,
      exchange_rate_source,
      exchange_rate_date,
      exchange_rate_period_start,
      exchange_rate_period_end,
      exchange_rate,
      alcohol_tax_cents,
      price_includes_vat,
      margin_percentage,
      calculated_price_cents,
      created_at,
      updated_at
    `)
    .order('wine_name');
    
  if (error) throw new Error(error.message);
  
  // Get all producers for the wines
  const producerIds = [...new Set(wines.map(wine => wine.producer_id))];
  const { data: producers } = await sb
    .from('producers')
    .select('id, name')
    .in('id', producerIds);
  
  // Create a map for quick lookup
  const producerMap = new Map(producers?.map(p => [p.id, p]) || []);
  
  // Combine wines with their producers
  const winesWithProducers = wines.map(wine => ({
    ...wine,
    producer: producerMap.get(wine.producer_id)
  }));
  
  return winesWithProducers;
}

export async function getWine(id: string) {
  const sb = await supabaseServer();
  
  // First get the wine
  const { data: wine, error } = await sb
    .from('wines')
    .select(`
      id,
      handle,
      wine_name,
      vintage,
      grape_varieties,
      color,
      label_image_path,
      base_price_cents,
      producer_id,
      cost_currency,
      cost_amount,
      exchange_rate_source,
      exchange_rate_date,
      exchange_rate_period_start,
      exchange_rate_period_end,
      exchange_rate,
      alcohol_tax_cents,
      price_includes_vat,
      margin_percentage,
      calculated_price_cents,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single();
    
  if (error) throw new Error(error.message);
  
  // Then get the producer information separately
  const { data: producer } = await sb
    .from('producers')
    .select('name')
    .eq('id', wine.producer_id)
    .single();
  
  const wineWithProducer = {
    ...wine,
    producer: producer
  };
  
  return wineWithProducer;
}

export async function createWine(data: CreateWineData) {
  const sb = await supabaseServer();
  
  // First create the wine
  const { data: wine, error } = await sb
    .from('wines')
    .insert(data)
    .select(`
      id,
      handle,
      wine_name,
      vintage,
      grape_varieties,
      color,
      label_image_path,
      base_price_cents,
      producer_id,
      cost_currency,
      cost_amount,
      exchange_rate_source,
      exchange_rate_date,
      exchange_rate_period_start,
      exchange_rate_period_end,
      exchange_rate,
      alcohol_tax_cents,
      price_includes_vat,
      margin_percentage,
      calculated_price_cents,
      created_at,
      updated_at
    `)
    .single();
    
  if (error) throw new Error(error.message);
  
  // Then get the producer information separately
  const { data: producer } = await sb
    .from('producers')
    .select('name')
    .eq('id', wine.producer_id)
    .single();
  
  const wineWithProducer = {
    ...wine,
    producer: producer
  };
  
  revalidatePath('/admin/wines');
  return wineWithProducer;
}

export async function updateWine(id: string, data: Partial<CreateWineData>) {
  const sb = await supabaseServer();
  
  // First update the wine
  const { data: wine, error } = await sb
    .from('wines')
    .update(data)
    .eq('id', id)
    .select(`
      id,
      handle,
      wine_name,
      vintage,
      grape_varieties,
      color,
      label_image_path,
      base_price_cents,
      producer_id,
      cost_currency,
      cost_amount,
      exchange_rate_source,
      exchange_rate_date,
      exchange_rate_period_start,
      exchange_rate_period_end,
      exchange_rate,
      alcohol_tax_cents,
      price_includes_vat,
      margin_percentage,
      calculated_price_cents,
      created_at,
      updated_at
    `)
    .single();
    
  if (error) throw new Error(error.message);
  
  // Then get the producer information separately
  const { data: producer } = await sb
    .from('producers')
    .select('name')
    .eq('id', wine.producer_id)
    .single();
  
  const wineWithProducer = {
    ...wine,
    producer: producer
  };
  
  revalidatePath('/admin/wines');
  revalidatePath(`/admin/wines/${id}`);
  return wineWithProducer;
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
