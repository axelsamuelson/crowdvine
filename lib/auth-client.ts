import { createClient } from '@supabase/supabase-js';

// Auth roles
export type UserRole = 'admin' | 'producer' | 'user';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  producer_id?: string;
}

// Supabase client för auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client-side auth helpers
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email: string, password: string, role: UserRole = 'user') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
      },
    },
  });

  if (data.user && !error) {
    // Skapa profile med role
    await supabase.from('profiles').insert({
      id: data.user.id,
      role,
      email,
    });
  }

  return { data, error };
}

export async function signOut() {
  return await supabase.auth.signOut();
}
