// Cloudflare Pages Function - Authentication Logout
// Handle user logout

export async function onRequestPost() {
  return new Response(JSON.stringify({
    success: true,
    message: 'Logout successful'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'cv-access=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
    }
  })
}