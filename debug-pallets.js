// Debug script to check pallets table
const { createClient } = require('@supabase/supabase-js');

async function debugPallets() {
  console.log("🔍 Debugging pallets table...");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing environment variables");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
    console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "SET" : "MISSING");
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log("\n1️⃣ Checking if pallets table exists...");
    
    // Try to get table info
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'pallets');
    
    if (tablesError) {
      console.error("❌ Error checking tables:", tablesError);
      return;
    }
    
    if (tables.length === 0) {
      console.log("❌ Pallets table does not exist!");
      return;
    }
    
    console.log("✅ Pallets table exists");
    
    console.log("\n2️⃣ Checking pallets table structure...");
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'pallets');
    
    if (columnsError) {
      console.error("❌ Error checking columns:", columnsError);
      return;
    }
    
    console.log("📋 Pallets table columns:");
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    console.log("\n3️⃣ Checking pallets data...");
    
    const { data: pallets, error: palletsError } = await supabase
      .from('pallets')
      .select('*')
      .limit(5);
    
    if (palletsError) {
      console.error("❌ Error fetching pallets:", palletsError);
      return;
    }
    
    console.log(`📊 Found ${pallets.length} pallets:`);
    pallets.forEach((pallet, index) => {
      console.log(`${index + 1}. ${pallet.name || 'Unnamed'} (ID: ${pallet.id})`);
    });
    
    if (pallets.length === 0) {
      console.log("ℹ️  No pallets found in database");
      
      console.log("\n4️⃣ Checking related tables...");
      
      // Check if there are any related tables
      const { data: allTables, error: allTablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%pallet%');
      
      if (allTablesError) {
        console.error("❌ Error checking all tables:", allTablesError);
        return;
      }
      
      console.log("📋 Tables containing 'pallet':");
      allTables.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

debugPallets().catch(console.error);
