'use server';

import { supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export interface SiteContent {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export async function getSiteContent(): Promise<SiteContent[]> {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('site_content')
    .select('*')
    .order('key');
    
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSiteContentByKey(key: string): Promise<string | null> {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('site_content')
    .select('value')
    .eq('key', key)
    .single();
    
  if (error) return null;
  return data?.value || null;
}

export async function updateSiteContent(key: string, value: string): Promise<void> {
  const sb = await supabaseServer();
  
  const { error } = await sb
    .from('site_content')
    .upsert({ key, value, updated_at: new Date().toISOString() });
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/content');
  revalidatePath('/'); // Revalidate homepage
}
