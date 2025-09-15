// Cloudflare Pages Function - Health Check
// Simple health endpoint for monitoring

export async function onRequest() {
  return Response.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'cloudflare-pages'
  });
}
