// Cloudflare Pages Function - Auth Logout
// TODO: Implement Supabase auth session cleanup

export async function onRequestPost(ctx: EventContext) {
  const { request, env } = ctx;
  
  try {
    // TODO: Implement Supabase logout
    // const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    // await supabase.auth.signOut();

    // Clear access cookie
    const response = Response.json({ 
      ok: true, 
      message: 'Logged out successfully' 
    });

    response.headers.set('Set-Cookie', 'cv-access=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict');
    
    return response;
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: 'Logout failed' 
    }, { status: 500 });
  }
}

// Handle GET requests
export async function onRequestGet() {
  return Response.json({ 
    ok: true, 
    message: 'Auth logout endpoint - TODO: implement Supabase logout' 
  });
}
