import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('Discount code webhook received:', payload);

    // Verify the webhook is from Supabase
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get the discount code details
    const { data: discountCode, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('id', payload.record.id)
      .single();

    if (error || !discountCode) {
      console.error('Error fetching discount code:', error);
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    // Get the user's profile
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', discountCode.earned_by_user_id)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('New discount code created for user:', user.id, 'Percentage:', discountCode.discount_percentage);

    // Here you could send an email notification, push notification, etc.
    // For now, we'll just log it

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
