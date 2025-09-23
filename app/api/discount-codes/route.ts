import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get user's discount codes (earned and used)
    const { data: discountCodes, error } = await supabase
      .from('discount_codes')
      .select('*')
      .or(`earned_by_user_id.eq.${user.id},used_by_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discount codes:', error);
      return NextResponse.json({ error: "Failed to fetch discount codes" }, { status: 500 });
    }

    return NextResponse.json({ discountCodes });

  } catch (error) {
    console.error('Discount codes API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { code, orderAmountCents } = await request.json();

    if (!code || !orderAmountCents) {
      return NextResponse.json({ error: "Code and order amount are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Validate and use discount code
    const { data: result, error } = await supabase.rpc('use_discount_code', {
      p_code: code,
      p_user_id: user.id,
      p_order_amount_cents: orderAmountCents
    });

    if (error) {
      console.error('Error using discount code:', error);
      return NextResponse.json({ error: "Failed to validate discount code" }, { status: 500 });
    }

    if (result && result.length > 0) {
      const discountResult = result[0];
      if (discountResult.success) {
        return NextResponse.json({
          success: true,
          discountAmountCents: discountResult.discount_amount_cents,
          message: "Discount applied successfully"
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: discountResult.error_message 
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Invalid discount code" }, { status: 400 });

  } catch (error) {
    console.error('Discount code validation error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
