// Development login endpoint
export async function onRequest(context: any) {
  const { request } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Development login - accept any credentials
    console.log(`[DEV] Login attempt: ${email}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Development login successful',
      user: {
        email,
        id: 'dev-user-123',
        role: 'admin'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'cv-access=1; HttpOnly; Secure; SameSite=Lax; Path=/',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}