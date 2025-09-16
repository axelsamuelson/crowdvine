export async function onRequest() {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    environment: 'cloudflare-preview',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
