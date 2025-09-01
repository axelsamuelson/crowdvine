'use server';

import { requireAuth } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';

export interface Booking {
  id: string;
  item_id: string;
  quantity: number;
  band: string;
  status: string;
  created_at: string;
  wine?: {
    wine_name: string;
    vintage: string;
    handle: string;
  };
}

export async function getBookings() {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('bookings')
    .select(`
      *,
      wine:campaign_items(wine_name, vintage, handle)
    `)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getBookingsByStatus(status: string) {
  await requireAuth('admin');
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('bookings')
    .select(`
      *,
      wine:campaign_items(wine_name, vintage, handle)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}
