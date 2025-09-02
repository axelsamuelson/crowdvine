'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function adminLogin(email: string, password: string) {
  try {
    console.log('Admin login attempt for:', email);

    // Skapa Supabase client med cookie-hantering
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, '', options);
          },
        },
      }
    );

    // Logga in användaren
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return { error: `Inloggning misslyckades: ${error.message}` };
    }

    if (!data?.user) {
      return { error: 'Ingen användare returnerades' };
    }

    console.log('User authenticated:', data.user.id);

    // Hämta profil för att verifiera admin-roll
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { error: 'Kunde inte hämta användarprofil' };
    }

    // Verifiera admin-roll
    if (profile?.role !== 'admin') {
      return { error: 'Du har inte admin-behörighet' };
    }

    console.log('Admin role verified');

    // Returnera success istället för att använda redirect
    return { success: true };

  } catch (error: any) {
    console.error('Unexpected error in admin login:', error);
    return { error: 'Ett oväntat fel uppstod' };
  }
}

export async function createAdminAccount(email: string, password: string) {
  try {
    console.log('Creating admin account for:', email);

    // Skapa Supabase client med service role för admin-operationer
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: (name: string) => '',
          set: (name: string, value: string, options: any) => {},
          remove: (name: string, options: any) => {},
        },
      }
    );

    // Skapa Supabase Auth-användare
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Bekräfta email direkt
      user_metadata: {
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      
      // Om användaren redan finns, försök att skapa profil istället
      if (authError.message.includes('already been registered')) {
        console.log('User already exists, attempting to create profile...');
        
        // Hitta den befintliga användaren
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
          // Kontrollera om profilen redan finns
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', existingUser.id)
            .single();
          
          if (!existingProfile) {
            // Skapa profil för befintlig användare
            const { error: profileError } = await supabaseAdmin
              .from('profiles')
              .insert({
                id: existingUser.id,
                email: existingUser.email,
                role: 'admin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('Profile creation error for existing user:', profileError);
              return { error: `Kunde inte skapa profil för befintlig användare: ${profileError.message}` };
            }

            console.log('Profile created for existing user');
            return {
              success: true,
              message: 'Profil skapad för befintlig användare! Du kan nu logga in.',
              user: {
                id: existingUser.id,
                email: existingUser.email,
                role: 'admin'
              }
            };
          } else {
            return { error: 'Användare finns redan och har en profil. Logga in istället.' };
          }
        }
      }
      
      return { error: `Kunde inte skapa användare: ${authError.message}` };
    }

    if (!authData.user) {
      return { error: 'Ingen användare skapades' };
    }

    console.log('Auth user created:', authData.user.id);

    // Skapa profil i profiles-tabellen
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);

      // Om profilskapning misslyckas, ta bort användaren
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('Failed to cleanup user after profile creation failure:', deleteError);
      }

      return { error: `Kunde inte skapa profil: ${profileError.message}` };
    }

    console.log('Profile created successfully');

    return {
      success: true,
      message: 'Admin-konto skapat framgångsrikt!',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'admin'
      }
    };

  } catch (error) {
    console.error('Unexpected error in create admin account:', error);
    return { error: 'Ett oväntat fel uppstod' };
  }
}

export async function signOut() {
  try {
    console.log('Signing out admin user');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, '', options);
          },
        },
      }
    );

    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      return { error: `Utloggning misslyckades: ${error.message}` };
    }

    console.log('Admin user signed out successfully');
    return { success: true };

  } catch (error) {
    console.error('Unexpected error in sign out:', error);
    return { error: 'Ett oväntat fel uppstod' };
  }
}
