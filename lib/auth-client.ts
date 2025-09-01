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
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase sign in error:', error);
      return { data: null, error };
    }

    if (data?.user) {
      // Hämta user profile för att verifiera role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return { 
          data: null, 
          error: { message: 'Kunde inte hämta användarprofil. Kontakta administratören.' } 
        };
      }

      if (profile?.role !== 'admin') {
        return { 
          data: null, 
          error: { message: 'Du har inte admin-behörighet. Kontakta administratören.' } 
        };
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in signIn:', err);
    return { 
      data: null, 
      error: { message: 'Ett oväntat fel uppstod under inloggning.' } 
    };
  }
}

export async function signUp(email: string, password: string, role: UserRole = 'user') {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    });

    if (error) {
      console.error('Supabase sign up error:', error);
      return { data: null, error };
    }

    if (data.user && !error) {
      try {
        // Skapa profile med role
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          role,
          email,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Rensa upp användaren om profile creation misslyckas
          await supabase.auth.admin.deleteUser(data.user.id);
          return { 
            data: null, 
            error: { message: 'Kunde inte skapa användarprofil. Försök igen.' } 
          };
        }
      } catch (profileErr) {
        console.error('Profile creation unexpected error:', profileErr);
        return { 
          data: null, 
          error: { message: 'Ett fel uppstod vid skapande av användarprofil.' } 
        };
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in signUp:', err);
    return { 
      data: null, 
      error: { message: 'Ett oväntat fel uppstod under registrering.' } 
    };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
    }
    return { error };
  } catch (err) {
    console.error('Unexpected error in signOut:', err);
    return { error: { message: 'Ett oväntat fel uppstod under utloggning.' } };
  }
}
