import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wineId, updateData } = body;
    
    console.log('Raw SQL update for wine:', wineId);
    console.log('Update data:', updateData);
    
    const sb = await supabaseServer();
    
    // Use raw SQL to avoid any ORM ambiguity issues
    const { data, error } = await sb.rpc('update_wine_raw', {
      wine_id: wineId,
      wine_name: updateData.wine_name,
      vintage: updateData.vintage,
      grape_varieties: updateData.grape_varieties,
      color: updateData.color,
      producer_id: updateData.producer_id,
      cost_currency: updateData.cost_currency,
      cost_amount: updateData.cost_amount,
      exchange_rate_source: updateData.exchange_rate_source,
      exchange_rate_date: updateData.exchange_rate_date,
      exchange_rate_period_start: updateData.exchange_rate_period_start,
      exchange_rate_period_end: updateData.exchange_rate_period_end,
      exchange_rate: updateData.exchange_rate,
      alcohol_tax_cents: updateData.alcohol_tax_cents,
      price_includes_vat: updateData.price_includes_vat,
      margin_percentage: updateData.margin_percentage,
      base_price_cents: updateData.base_price_cents,
    });
      
    if (error) {
      console.error('Raw SQL update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Raw SQL update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
