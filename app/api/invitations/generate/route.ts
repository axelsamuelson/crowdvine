import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { expiresInDays = 30 } = await request.json();
    
    // Get current user from cookie
    const cookieStore = await request.cookies;
    const adminAuthCookie = cookieStore.get('admin-auth')?.value;
    const adminEmailCookie = cookieStore.get('admin-email')?.value;
    
    if (!adminAuthCookie || adminAuthCookie !== 'true' || !adminEmailCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, access_granted_at')
      .eq('email', adminEmailCookie)
      .eq('access_granted_at')
      .not('access_granted_at', 'is', null)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found or no access" }, { status: 403 });
    }

    // Generate invitation code
    const code = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation
    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({
        code,
        created_by: profile.id,
        expires_at: expiresAt.toISOString(),
        max_uses: 1,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }

    // Generate signup URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const signupUrl = `${baseUrl}/signup?invite=${code}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: data.id,
        code,
        signupUrl,
        expiresAt: data.expires_at,
        maxUses: data.max_uses
      }
    });

  } catch (error) {
    console.error('Generate invitation error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
