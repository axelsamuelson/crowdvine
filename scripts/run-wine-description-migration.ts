import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log("Running wine description migration...");
  
  try {
    // Check if description column already exists
    const { data: columns, error: columnError } = await supabase
      .from('wines')
      .select('description')
      .limit(1);
    
    if (columnError && columnError.code === 'PGRST205') {
      console.log("Description column doesn't exist, creating it...");
      
      // Since we can't run DDL directly, we'll print the SQL for manual execution
      console.log("\n=== MANUAL SQL TO RUN IN SUPABASE DASHBOARD ===");
      console.log("ALTER TABLE wines ADD COLUMN description TEXT;");
      console.log("CREATE INDEX idx_wines_description ON wines(description);");
      console.log(`
UPDATE wines 
SET description = CONCAT(
  'This exceptional ', 
  COALESCE(color, 'wine'), 
  ' wine from ', 
  vintage, 
  ' showcases the unique characteristics of ', 
  COALESCE(grape_varieties, 'carefully selected grapes'), 
  '. Crafted with precision and passion, this wine offers a perfect balance of flavors and aromas that will delight your palate.'
)
WHERE description IS NULL;
      `);
      console.log("=== END MANUAL SQL ===");
      
    } else if (!columnError) {
      console.log("✅ Description column already exists");
      
      // Update existing wines with descriptions if they don't have them
      const { data: wines, error: selectError } = await supabase
        .from('wines')
        .select('id, color, vintage, grape_varieties')
        .is('description', null)
        .limit(10);
      
      if (selectError) {
        console.error("Error selecting wines:", selectError);
        return;
      }
      
      if (wines && wines.length > 0) {
        console.log(`Found ${wines.length} wines without descriptions, updating...`);
        
        for (const wine of wines) {
          const description = `This exceptional ${wine.color || 'wine'} wine from ${wine.vintage} showcases the unique characteristics of ${wine.grape_varieties || 'carefully selected grapes'}. Crafted with precision and passion, this wine offers a perfect balance of flavors and aromas that will delight your palate.`;
          
          const { error: updateError } = await supabase
            .from('wines')
            .update({ description })
            .eq('id', wine.id);
          
          if (updateError) {
            console.error(`Error updating wine ${wine.id}:`, updateError);
          } else {
            console.log(`✅ Updated wine ${wine.id}`);
          }
        }
      } else {
        console.log("✅ All wines already have descriptions");
      }
    }
    
    console.log("Migration completed!");
    
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

runMigration();