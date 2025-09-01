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
    console.log('Starting sign up process for:', email);
    
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
              console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
      return { data: null, error };
    }

    console.log('Auth signup successful, user:', data?.user?.id);

            if (data.user && !error) {
          try {
            console.log('Creating profile for user:', data.user.id);
            
            // Skapa profile med role
            const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              role,
              email,
            });

            if (profileError) {
              console.error('Profile creation error:', profileError);
              console.error('Profile error details:', {
                message: profileError.message,
                details: profileError.details,
                hint: profileError.hint,
                code: profileError.code
              });
              
              // Om det är RLS recursion error, försök igen utan profile creation
              if (profileError.message?.includes('infinite recursion') || 
                  profileError.message?.includes('policy')) {
                console.log('RLS policy error detected, continuing without profile creation');
                // Fortsätt utan profile creation - användaren kan skapas senare
                return { data, error: null };
              }
              
              // Om det är foreign key constraint error, vänta lite och försök igen
              if (profileError.message?.includes('foreign key constraint') ||
                  profileError.message?.includes('profiles_id_fkey')) {
                console.log('Foreign key constraint error detected, waiting and retrying...');
                
                // Vänta 2 sekunder och försök igen
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const { error: retryError } = await supabase.from('profiles').insert({
                  id: data.user.id,
                  role,
                  email,
                });
                
                if (retryError) {
                  console.error('Retry failed:', retryError);
                  // Fortsätt utan profile creation
                  return { data, error: null };
                } else {
                  console.log('Profile created successfully on retry');
                  return { data, error: null };
                }
              }
              
              // Rensa upp användaren om profile creation misslyckas
              console.log('Attempting to clean up user after profile creation failure');
              try {
                await supabase.auth.admin.deleteUser(data.user.id);
              } catch (cleanupError) {
                console.error('Failed to cleanup user:', cleanupError);
              }
              
              return { 
                data: null, 
                error: { 
                  message: `Kunde inte skapa användarprofil: ${profileError.message || 'Okänt fel'}` 
                } 
              };
            }
            
            console.log('Profile created successfully');
          } catch (profileErr) {
            console.error('Profile creation unexpected error:', profileErr);
            return { 
              data: null, 
              error: { message: `Ett fel uppstod vid skapande av användarprofil: ${profileErr}` } 
            };
          }
        }

    console.log('Sign up process completed successfully');
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error in signUp:', err);
    return { 
      data: null, 
      error: { message: `Ett oväntat fel uppstod under registrering: ${err}` } 
    };
  }
}

// Test function för att verifiera databasanslutning
export async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Testa att hämta från profiles-tabellen
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Database connection successful');
    return { success: true, data };
  } catch (err) {
    console.error('Database connection test error:', err);
    return { success: false, error: err };
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
