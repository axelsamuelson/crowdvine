// Cloudflare Pages Function - Auth Login
// TODO: Implement Supabase auth via env.SUPABASE_URL/KEY

export async function onRequestPost(ctx: EventContext) {
  const { request, env } = ctx;
  
  try {
    const body = await request.json();
    const { email, password } = body;

    // TODO: Implement Supabase authentication
    // const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    // const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    return Response.json({ 
      ok: true, 
      message: 'Auth login endpoint - TODO: implement Supabase auth',
      email: email // For testing
    });
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: 'Invalid request body' 
    }, { status: 400 });
  }
}

// Handle GET requests (redirect to login page)
export async function onRequestGet() {
  return Response.redirect('/access-request', 302);
}
