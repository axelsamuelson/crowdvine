const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin access
const supabase = createClient(
  'https://abrnvjqwpdkodgrtezeg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicm52anF3cGRrb2RncnRlemVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY3NDA2MywiZXhwIjoyMDcyMjUwMDYzfQ.lTAQI8XaCOS31vy1xreJQeTUgQ8bLMyr4yDsywOWb5M'
);

async function createTestInvitation() {
  try {
    // Generate a random 12-character code
    const code = Math.random().toString(36).substring(2, 14).toUpperCase();
    
    // Use an existing user ID from the debug data
    const createdBy = 'a957a784-6112-4ec9-b474-f2b025fc4fad';
    
    const { data, error } = await supabase
      .from('invitation_codes')
      .insert({
        code: code,
        created_by: createdBy,
        max_uses: 1,
        current_uses: 0,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
      .select();
    
    if (error) {
      console.error('Error creating invitation:', error);
      return;
    }
    
    console.log('✅ Test invitation created successfully!');
    console.log('Code:', code);
    console.log('URL:', `https://pactwines.com/i/${code}`);
    console.log('Data:', data);
    
    return code;
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestInvitation();
