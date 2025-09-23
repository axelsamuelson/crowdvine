import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    console.log("=== SUPABASE CONNECTION TEST START ===");

    const supabase = getSupabaseAdmin();
    console.log("Supabase client created successfully");

    // Test simple query
    const { data, error } = await supabase
      .from("access_tokens")
      .select("count")
      .limit(1);

    console.log("Query result:", { data, error });

    if (error) {
      console.error("Supabase query error:", error);
      return Response.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      );
    }

    console.log("=== SUPABASE CONNECTION TEST END ===");

    return Response.json({
      success: true,
      message: "Supabase connection successful",
      data: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("=== SUPABASE CONNECTION TEST ERROR ===");
    console.error("Error:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
