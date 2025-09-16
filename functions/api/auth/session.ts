// Development session check endpoint
export async function onRequest(context: any) {
  const { request } = context;
  const cookieHeader = request.headers.get('Cookie');
  const isLoggedIn = cookieHeader?.includes('cv-access=1');
  
  return new Response(JSON.stringify({
    isLoggedIn,
    user: isLoggedIn ? {
      id: 'dev-user-123',
      email: 'dev@crowdvine.com',
      role: 'admin'
    } : null,
    environment: 'development'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}