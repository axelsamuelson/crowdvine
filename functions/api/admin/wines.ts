// Cloudflare Pages Function - Admin Wines
// TODO: Implement admin wine management

export async function onRequestGet(ctx: EventContext) {
  const { request, env } = ctx;
  
  try {
    // TODO: Implement Supabase query for wines
    // const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    // const { data, error } = await supabase
    //   .from('wines')
    //   .select('*');

    return Response.json({ 
      ok: true, 
      message: 'Admin wines endpoint - TODO: implement Supabase query',
      wines: []
    });
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: 'Failed to fetch wines' 
    }, { status: 500 });
  }
}

export async function onRequestPost(ctx: EventContext) {
  const { request, env } = ctx;
  
  try {
    const body = await request.json();
    
    // TODO: Implement wine creation
    // const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    // const { data, error } = await supabase
    //   .from('wines')
    //   .insert(body);

    return Response.json({ 
      ok: true, 
      message: 'Admin wines creation - TODO: implement Supabase insert',
      wine: body
    });
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: 'Failed to create wine' 
    }, { status: 500 });
  }
}
