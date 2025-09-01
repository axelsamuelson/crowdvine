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
          
          // Hantera specifika felmeddelanden
          let errorMessage = error.message || 'Okänt fel';
          
          // Kontrollera om det är ett email-redan-existerar fel
          if (errorMessage.includes('already registered') || 
              errorMessage.includes('already exists') ||
              errorMessage.includes('duplicate key')) {
            
            // Kontrollera om användaren är bekräftad genom att försöka logga in
            try {
              const { data: existingUser } = await supabase.auth.signInWithPassword({
                email,
                password: 'dummy-password-for-check' // Vi använder bara detta för att kolla status
              });
              
              if (existingUser?.user?.email_confirmed_at) {
                return {
                  data: null,
                  error: { message: 'Ett konto med denna email finns redan och är bekräftat. Använd "Sign In" istället.' }
                };
              } else {
                return {
                  data: null,
                  error: { message: 'Ett konto med denna email finns redan men är inte bekräftat. Kontrollera din inkorg eller begär nytt bekräftelsemail.' }
                };
              }
            } catch (checkError) {
              // Om vi inte kan logga in, är användaren troligen inte bekräftad
              return {
                data: null,
                error: { message: 'Ett konto med denna email finns redan men är inte bekräftat. Kontrollera din inkorg eller begär nytt bekräftelsemail.' }
              };
            }
          }
          
          switch (errorMessage) {
            case 'Password should be at least 6 characters':
              return {
                data: null,
                error: { message: 'Lösenordet måste vara minst 6 tecken långt' }
              };
              
            case 'Unable to validate email address: invalid format':
              return {
                data: null,
                error: { message: 'Ange en giltig email-adress' }
              };
              
            case 'Signup is disabled':
              return {
                data: null,
                error: { message: 'Registrering är inaktiverat. Kontakta administratören.' }
              };
              
            default:
              if (errorMessage.includes('profiles')) {
                return {
                  data: null,
                  error: { message: `Database-fel: ${errorMessage}. Kontrollera att profiles-tabellen finns.` }
                };
              } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                return {
                  data: null,
                  error: { message: 'Nätverksfel. Kontrollera din internetanslutning.' }
                };
              } else {
                return {
                  data: null,
                  error: { message: `Registrering misslyckades: ${errorMessage}` }
                };
              }
          }
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
              
              // Om det är duplicate key error (email redan finns), kontrollera status
              if (profileError.message?.includes('duplicate key') && 
                  profileError.message?.includes('profiles_email_key')) {
                console.log('Duplicate email detected in profiles table, checking user status...');
                
                // Kontrollera om användaren är bekräftad
                try {
                  const { data: existingUser } = await supabase.auth.signInWithPassword({
                    email,
                    password: 'dummy-password-for-check'
                  });
                  
                  if (existingUser?.user?.email_confirmed_at) {
                    // Rensa upp den nya användaren och returnera fel
                    try {
                      await supabase.auth.admin.deleteUser(data.user.id);
                    } catch (cleanupError) {
                      console.error('Failed to cleanup user:', cleanupError);
                    }
                    
                    return {
                      data: null,
                      error: { message: 'Ett konto med denna email finns redan och är bekräftat. Använd "Sign In" istället.' }
                    };
                  } else {
                    // Rensa upp den nya användaren och returnera fel
                    try {
                      await supabase.auth.admin.deleteUser(data.user.id);
                    } catch (cleanupError) {
                      console.error('Failed to cleanup user:', cleanupError);
                    }
                    
                    return {
                      data: null,
                      error: { message: 'Ett konto med denna email finns redan men är inte bekräftat. Kontrollera din inkorg eller begär nytt bekräftelsemail.' }
                    };
                  }
                } catch (checkError) {
                  // Om vi inte kan logga in, är användaren troligen inte bekräftad
                  try {
                    await supabase.auth.admin.deleteUser(data.user.id);
                  } catch (cleanupError) {
                    console.error('Failed to cleanup user:', cleanupError);
                  }
                  
                  return {
                    data: null,
                    error: { message: 'Ett konto med denna email finns redan men är inte bekräftat. Kontrollera din inkorg eller begär nytt bekräftelsemail.' }
                  };
                }
              }
              
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

// Funktion för att skicka om bekräftelsemail
export async function resendConfirmationEmail(email: string) {
  try {
    console.log('Attempting to resend confirmation email to:', email);
    
    // Validera email-format
    if (!email || !email.includes('@')) {
      return {
        error: { message: 'Ogiltig email-adress. Ange en giltig email-adress.' }
      };
    }
    
    // Först kontrollera om användaren finns och är bekräftad
    try {
      const { data: existingUser } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-for-check'
      });
      
      if (existingUser?.user?.email_confirmed_at) {
        return {
          error: { message: 'Denna email är redan bekräftad. Du kan logga in direkt.' }
        };
      }
    } catch (checkError) {
      // Detta är förväntat - vi kan inte logga in med dummy password
      console.log('User not confirmed, proceeding with resend...');
    }
    
    // Försök skicka om bekräftelsemail
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    
    if (error) {
      console.error('Resend confirmation error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      // Hantera specifika fel
      let errorMessage = error.message || 'Okänt fel';
      
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        return {
          error: { message: 'Ingen användare hittades med denna email-adress. Kontrollera att du använde rätt email eller skapa ett nytt konto.' }
        };
      }
      
      if (errorMessage.includes('already confirmed') || errorMessage.includes('confirmed')) {
        return {
          error: { message: 'Denna email är redan bekräftad. Du kan logga in direkt.' }
        };
      }
      
      if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
        return {
          error: { message: 'För många försök. Vänta några minuter innan du försöker igen.' }
        };
      }
      
      if (errorMessage.includes('disabled') || errorMessage.includes('not enabled')) {
        return {
          error: { message: 'Email-bekräftelse är inaktiverat. Kontakta administratören för att aktivera det.' }
        };
      }
      
      return {
        error: { message: `Kunde inte skicka om bekräftelsemail: ${errorMessage}` }
      };
    }
    
    console.log('Confirmation email resent successfully');
    return { 
      error: null,
      success: true,
      message: 'Bekräftelsemail skickat! Kontrollera din inkorg (och spam-mappen). Om du inte får email inom några minuter, kontrollera Supabase-inställningar.'
    };
  } catch (err) {
    console.error('Unexpected error in resendConfirmationEmail:', err);
    return { 
      error: { message: `Ett oväntat fel uppstod vid omföljning av bekräftelsemail: ${err}` } 
    };
  }
}

// Funktion för att kontrollera email-inställningar
export async function checkEmailSettings() {
  try {
    console.log('Checking email settings...');
    
    // Först kontrollera att Supabase-anslutningen fungerar
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('Database connection test failed:', testError);
      return {
        enabled: false,
        message: `Databasanslutning misslyckades: ${testError.message}. Kontrollera Supabase-inställningar.`
      };
    }
    
    console.log('Database connection successful, testing email...');
    
    // Testa att skicka ett test-email (detta kommer att misslyckas men vi får felmeddelandet)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: 'test@example.com',
    });
    
    if (error) {
      console.log('Email settings check result:', error.message);
      
      if (error.message.includes('disabled') || error.message.includes('not enabled')) {
        return {
          enabled: false,
          message: 'Email-bekräftelse är inaktiverat i Supabase. Gå till Supabase Dashboard → Authentication → Settings → Email Auth och aktivera "Enable email confirmations".'
        };
      }
      
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return {
          enabled: true,
          message: 'Email-bekräftelse är aktiverat (test-email misslyckades som förväntat eftersom användaren inte finns).'
        };
      }
      
      if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        return {
          enabled: true,
          message: 'Email-bekräftelse är aktiverat men rate limiting är aktiverat. Vänta några minuter.'
        };
      }
      
      return {
        enabled: true,
        message: `Email-inställningar: ${error.message}`
      };
    }
    
    return {
      enabled: true,
      message: 'Email-bekräftelse är aktiverat och fungerar.'
    };
  } catch (err) {
    console.error('Error checking email settings:', err);
    return {
      enabled: false,
      message: `Kunde inte kontrollera email-inställningar: ${err}`
    };
  }
}
