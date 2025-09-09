import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await supabaseServer();

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Fetch invitation codes
    const { data: invitationCodes, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitation codes:', error);
      return NextResponse.json({ error: "Failed to fetch invitation codes" }, { status: 500 });
    }

    return NextResponse.json(invitationCodes || []);

  } catch (error) {
    console.error('Invitation codes API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, expiryDays } = await request.json();

    const supabase = await supabaseServer();

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Generate invitation code using database function
    const { data: code, error: codeError } = await supabase
      .rpc('generate_invitation_code');

    if (codeError) {
      console.error('Error generating invitation code:', codeError);
      return NextResponse.json({ error: "Failed to generate invitation code" }, { status: 500 });
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30));

    // Create invitation code
    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({
        code,
        email: email || null,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation code:', error);
      return NextResponse.json({ error: "Failed to create invitation code" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Create invitation code API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
