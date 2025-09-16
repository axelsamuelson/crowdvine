// Development admin wines endpoint
export async function onRequest(context: any) {
  const { request } = context;
  
  // Development - allow all requests
  console.log(`[DEV] Admin wines request: ${request.method} ${request.url}`);
  
  if (request.method === 'GET') {
    // Return mock wines data
    return new Response(JSON.stringify({
      wines: [
        {
          id: 'dev-wine-1',
          name: 'Development Wine 1',
          price: 299,
          description: 'A development wine for testing',
          image_url: 'https://dev-images.crowdvine.com/wine1.jpg'
        },
        {
          id: 'dev-wine-2',
          name: 'Development Wine 2',
          price: 399,
          description: 'Another development wine',
          image_url: 'https://dev-images.crowdvine.com/wine2.jpg'
        }
      ],
      environment: 'development'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  
  if (request.method === 'POST') {
    const body = await request.json();
    console.log(`[DEV] Creating wine:`, body);
    
    return new Response(JSON.stringify({
      success: true,
      wine: {
        id: `dev-wine-${Date.now()}`,
        ...body,
        created_at: new Date().toISOString()
      },
      environment: 'development'
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  
  return new Response('Method not allowed', { status: 405 });
}