import { createClient } from '@supabase/supabase-js';

export async function onRequest(context: any) {
  const { request } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, password } = await request.json();

    // Create Supabase client
    const supabase = createClient(
      context.env.NEXT_PUBLIC_SUPABASE_URL,
      context.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Sign in user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(JSON.stringify({ 
        error: `Inloggning misslyckades: ${error.message}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!data?.user) {
      return new Response(JSON.stringify({ 
        error: "Ingen användare returnerades" 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return new Response(JSON.stringify({ 
        error: "Du har inte admin-behörighet" 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set access cookie
    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    response.headers.set('Set-Cookie', 'cv-access=1; HttpOnly; Secure; SameSite=Lax; Path=/');

    return response;

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Ett oväntat fel uppstod" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
