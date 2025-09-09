import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('access_requests')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: "Access request already pending for this email" },
          { status: 409 }
        );
      } else if (existingRequest.status === 'approved') {
        return NextResponse.json(
          { error: "Access already granted for this email" },
          { status: 409 }
        );
      }
    }

    // Create new access request
    const { data, error } = await supabase
      .from('access_requests')
      .insert({
        email: email.toLowerCase(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating access request:', error);
      return NextResponse.json(
        { error: "Failed to submit access request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Access request submitted successfully",
      data: data,
    });

  } catch (error) {
    console.error('Access request error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
