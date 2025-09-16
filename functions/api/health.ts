// Health check endpoint for development
export async function onRequest() {
  return new Response(JSON.stringify({
    status: 'ok',
    environment: 'development',
    timestamp: new Date().toISOString(),
    message: 'Crowdvine development environment is running'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}