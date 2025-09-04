import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get('from');
    const toCurrency = searchParams.get('to') || 'SEK';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const sb = await supabaseServer();
    
    if (fromCurrency) {
      // Get specific exchange rate
      const { data, error } = await sb
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('date', date)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Exchange rate error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ 
        rate: data?.[0]?.rate || null,
        date: date,
        from_currency: fromCurrency,
        to_currency: toCurrency
      });
    } else {
      // Get all recent exchange rates
      const { data, error } = await sb
        .from('exchange_rates')
        .select('*')
        .eq('to_currency', toCurrency)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });
        
      if (error) {
        console.error('Exchange rates error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ rates: data || [] });
    }
  } catch (error) {
    console.error('Exchange rates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from_currency, to_currency, rate, date } = body;
    
    if (!from_currency || !to_currency || !rate || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const sb = await supabaseServer();
    
    const { data, error } = await sb
      .from('exchange_rates')
      .insert({
        from_currency,
        to_currency,
        rate: parseFloat(rate),
        date
      })
      .select()
      .single();
      
    if (error) {
      console.error('Insert exchange rate error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Exchange rates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
