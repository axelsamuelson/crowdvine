const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupStorage() {
  console.log('🔍 Setting up Supabase Storage...');
  
  try {
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    console.log('📦 Existing buckets:');
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (public: ${bucket.public})`);
    });
    
    // Check if uploads bucket exists
    const uploadsBucket = buckets.find(b => b.name === 'uploads');
    if (!uploadsBucket) {
      console.log('❌ uploads bucket not found, creating it...');
      
      const { data, error: createError } = await supabase.storage.createBucket('uploads', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        console.error('❌ Error creating uploads bucket:', createError);
      } else {
        console.log('✅ uploads bucket created successfully');
      }
    } else {
      console.log('✅ uploads bucket already exists');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

setupStorage();
