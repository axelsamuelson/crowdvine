import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/debug/env-check
 * 
 * Diagnostic endpoint to check environment configuration
 * Admin-only access
 */
export async function GET() {
  try {
    // Check if user is admin
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {}
    };

    // Check Supabase URL
    diagnostics.checks.supabaseUrl = {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + "..." 
        : null
    };

    // Check Supabase Anon Key
    diagnostics.checks.supabaseAnonKey = {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      format: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'JWT-like' : 'invalid',
      length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    };

    // Check Supabase Service Role Key (CRITICAL)
    diagnostics.checks.supabaseServiceKey = {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      format: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') ? 'JWT-like' : 'invalid',
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    };

    // Test admin client creation
    try {
      const adminClient = getSupabaseAdmin();
      diagnostics.checks.adminClient = {
        creation: 'success',
        canConnect: true
      };

      // Test a simple query
      const { data, error } = await adminClient
        .from('profiles')
        .select('id')
        .limit(1);

      diagnostics.checks.adminClient.canQuery = !error;
      diagnostics.checks.adminClient.queryError = error ? {
        code: error.code,
        message: error.message
      } : null;
    } catch (adminError: any) {
      diagnostics.checks.adminClient = {
        creation: 'failed',
        error: adminError.message
      };
    }

    // Test user membership query
    try {
      const adminClient = getSupabaseAdmin();
      const { data, error } = await adminClient
        .from('user_memberships')
        .select('level')
        .eq('user_id', user.id)
        .single();

      diagnostics.checks.membershipQuery = {
        success: !error,
        hasData: !!data,
        error: error ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        } : null
      };
    } catch (membershipError: any) {
      diagnostics.checks.membershipQuery = {
        success: false,
        error: membershipError.message
      };
    }

    // Test invitation_codes query
    try {
      const adminClient = getSupabaseAdmin();
      const { data, error } = await adminClient
        .from('invitation_codes')
        .select('id')
        .limit(1);

      diagnostics.checks.invitationCodesQuery = {
        success: !error,
        canRead: !error,
        error: error ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        } : null
      };
    } catch (invitationError: any) {
      diagnostics.checks.invitationCodesQuery = {
        success: false,
        error: invitationError.message
      };
    }

    // Test invitation_codes INSERT (dry run - will rollback)
    try {
      const adminClient = getSupabaseAdmin();
      const testCode = 'TEST_' + Date.now();
      
      const { data, error } = await adminClient
        .from('invitation_codes')
        .insert({
          code: testCode,
          created_by: user.id,
          expires_at: new Date(Date.now() + 1000).toISOString(),
          max_uses: 1,
          is_active: false, // Mark as inactive so it doesn't interfere
          initial_level: 'basic'
        })
        .select()
        .single();

      if (!error && data) {
        // Clean up test record
        await adminClient
          .from('invitation_codes')
          .delete()
          .eq('id', data.id);

        diagnostics.checks.invitationCodesInsert = {
          success: true,
          canInsert: true
        };
      } else {
        diagnostics.checks.invitationCodesInsert = {
          success: false,
          canInsert: false,
          error: error ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          } : null
        };
      }
    } catch (insertError: any) {
      diagnostics.checks.invitationCodesInsert = {
        success: false,
        error: insertError.message
      };
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    console.error("[ENV-CHECK] Diagnostic error:", error);
    return NextResponse.json(
      { 
        error: "Diagnostic check failed",
        message: error.message
      },
      { status: 500 }
    );
  }
}

