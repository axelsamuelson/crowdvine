// Development logout endpoint
export async function onRequest() {
  return new Response(JSON.stringify({
    success: true,
    message: 'Logged out successfully'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'cv-access=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
}