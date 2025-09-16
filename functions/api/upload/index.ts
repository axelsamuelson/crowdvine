// Development upload endpoint
export async function onRequest(context: any) {
  const { request } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({
        error: 'No file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[DEV] Uploading file: ${file.name}, size: ${file.size}`);
    
    // Development upload - return mock URL
    const mockUrl = `https://dev-uploads.crowdvine.com/${Date.now()}-${file.name}`;
    
    return new Response(JSON.stringify({
      success: true,
      url: mockUrl,
      filename: file.name,
      size: file.size,
      environment: 'development'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}