import { createBrowserClient } from '@supabase/ssr';

// Kontrollera att miljövariabler finns
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables in client:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING');
  throw new Error('Supabase environment variables are not configured. Please check your .env.local file.');
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseKey
);
