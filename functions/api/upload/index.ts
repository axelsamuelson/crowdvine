// Cloudflare Pages Function - File Upload
// TODO: Implement file upload to R2/Supabase Storage

export async function onRequestPost(ctx: EventContext) {
  const { request, env } = ctx;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ 
        ok: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }

    // TODO: Implement file upload to R2 or Supabase Storage
    // Option 1: Cloudflare R2
    // const r2Object = await env.R2_BUCKET.put(file.name, file.stream());
    
    // Option 2: Supabase Storage
    // const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    // const { data, error } = await supabase.storage
    //   .from('uploads')
    //   .upload(file.name, file);

    return Response.json({ 
      ok: true, 
      message: 'File upload endpoint - TODO: implement R2/Supabase Storage',
      filename: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    return Response.json({ 
      ok: false, 
      error: 'Upload failed' 
    }, { status: 500 });
  }
}

// Handle GET requests
export async function onRequestGet() {
  return Response.json({ 
    ok: true, 
    message: 'File upload endpoint - TODO: implement R2/Supabase Storage' 
  });
}
