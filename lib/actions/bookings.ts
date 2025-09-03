'use server';

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
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('bookings')
    .select(`
      *,
      wine:wines(wine_name, vintage, handle)
    `)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}

export async function getBookingsByStatus(status: string) {
  const sb = await supabaseServer();
  
  const { data, error } = await sb
    .from('bookings')
    .select(`
      *,
      wine:wines(wine_name, vintage, handle)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}
