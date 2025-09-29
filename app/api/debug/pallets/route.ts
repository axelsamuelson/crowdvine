import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    console.log("🔍 Debugging pallets table...");
    
    // Check if pallets table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'pallets');
    
    if (tablesError) {
      console.error("❌ Error checking tables:", tablesError);
      return NextResponse.json({ 
        error: "Error checking tables", 
        details: tablesError.message 
      }, { status: 500 });
    }
    
    if (tables.length === 0) {
      return NextResponse.json({ 
        error: "Pallets table does not exist",
        tables: tables
      });
    }
    
    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'pallets');
    
    if (columnsError) {
      console.error("❌ Error checking columns:", columnsError);
      return NextResponse.json({ 
        error: "Error checking columns", 
        details: columnsError.message 
      }, { status: 500 });
    }
    
    // Get pallets data
    const { data: pallets, error: palletsError } = await supabase
      .from('pallets')
      .select('*')
      .limit(5);
    
    if (palletsError) {
      console.error("❌ Error fetching pallets:", palletsError);
      return NextResponse.json({ 
        error: "Error fetching pallets", 
        details: palletsError.message 
      }, { status: 500 });
    }
    
    // Check related tables
    const { data: allTables, error: allTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%pallet%');
    
    return NextResponse.json({
      success: true,
      tableExists: tables.length > 0,
      columns: columns,
      palletsCount: pallets.length,
      pallets: pallets,
      relatedTables: allTables,
      error: allTablesError ? allTablesError.message : null
    });
    
  } catch (error) {
    console.error("❌ Unexpected error in debug pallets:", error);
    return NextResponse.json({ 
      error: "Unexpected error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
