import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const sb = await supabaseServer();

    // Insert access request
    const { data, error } = await sb
      .from('access_requests')
      .insert({
        email: email.toLowerCase().trim(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      // If email already exists, that's okay - don't show error
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ 
          success: true, 
          message: "Access request submitted! We'll review your application soon." 
        });
      }
      
      console.error('Error creating access request:', error);
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Access request submitted! We'll review your application soon." 
    });

  } catch (error) {
    console.error('Access request API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}