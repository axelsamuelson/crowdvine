'use server';

import { requireAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

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
}

export async function getProducers() {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('producers')
    .select('*')
    .order('name');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getProducer(id: string) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('producers')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}

export async function createProducer(data: CreateProducerData) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data: producer, error } = await sb
    .from('producers')
    .insert(data)
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/producers');
  return producer;
}

export async function updateProducer(id: string, data: Partial<CreateProducerData>) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data: producer, error } = await sb
    .from('producers')
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/producers');
  revalidatePath(`/admin/producers/${id}`);
  return producer;
}

export async function deleteProducer(id: string) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { error } = await sb
    .from('producers')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/producers');
}
