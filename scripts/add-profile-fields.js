const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addProfileFields() {
  try {
    console.log('Adding profile fields to profiles table...');
    
    // Add columns to profiles table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS full_name text,
        ADD COLUMN IF NOT EXISTS phone text,
        ADD COLUMN IF NOT EXISTS address text,
        ADD COLUMN IF NOT EXISTS city text,
        ADD COLUMN IF NOT EXISTS postal_code text,
        ADD COLUMN IF NOT EXISTS country text DEFAULT 'Sweden';
        
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
        CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
      `
    });

    if (error) {
      console.error('Error adding profile fields:', error);
      return;
    }

    console.log('✅ Profile fields added successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addProfileFields();
