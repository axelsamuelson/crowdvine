import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('Invitation webhook received:', payload);

    // Verify the webhook is from Supabase
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get the invitation details
    const { data: invitation, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('id', payload.record.id)
      .single();

    if (error || !invitation) {
      console.error('Error fetching invitation:', error);
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Get the inviter's profile
    const { data: inviter, error: inviterError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', invitation.created_by)
      .single();

    if (inviterError || !inviter) {
      console.error('Error fetching inviter:', inviterError);
      return NextResponse.json({ error: 'Inviter not found' }, { status: 404 });
    }

    // Check if this is a new usage
    if (payload.type === 'UPDATE' && payload.record.current_uses > 0) {
      console.log('Invitation was used, creating reward for inviter:', inviter.id);
      
      // Create 5% reward for account creation
      const { data: reward, error: rewardError } = await supabase.rpc('create_invitation_reward_discount', {
        p_user_id: inviter.id,
        p_invitation_id: invitation.id,
        p_discount_percentage: 5,
        p_reward_tier: 'account_created'
      });

      if (rewardError) {
        console.error('Error creating reward:', rewardError);
      } else {
        console.log('Reward created successfully:', reward);
      }
    }

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
