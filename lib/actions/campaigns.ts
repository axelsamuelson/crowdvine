'use server';

import { requireAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'live' | 'triggered' | 'closed';
  producer_id: string;
  producer?: {
    name: string;
  };
}

export interface CreateCampaignData {
  title: string;
  description: string;
  status: 'draft' | 'live' | 'triggered' | 'closed';
  producer_id: string;
}

export async function getCampaigns() {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('campaigns')
    .select(`
      *,
      producer:producers(name)
    `)
    .order('title');
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getCampaign(id: string) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('campaigns')
    .select(`
      *,
      producer:producers(name)
    `)
    .eq('id', id)
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}

export async function createCampaign(data: CreateCampaignData) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data: campaign, error } = await sb
    .from('campaigns')
    .insert(data)
    .select(`
      *,
      producer:producers(name)
    `)
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/campaigns');
  return campaign;
}

export async function updateCampaign(id: string, data: Partial<CreateCampaignData>) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data: campaign, error } = await sb
    .from('campaigns')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      producer:producers(name)
    `)
    .single();
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/campaigns');
  revalidatePath(`/admin/campaigns/${id}`);
  return campaign;
}

export async function deleteCampaign(id: string) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { error } = await sb
    .from('campaigns')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
  
  revalidatePath('/admin/campaigns');
}
