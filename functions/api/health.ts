// Cloudflare Pages Function - Health Check
// Simple health check endpoint

import { success, corsHeaders } from '../_lib/response'

export async function onRequestGet(ctx: any) {
  const { request } = ctx
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production'
  }

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      ...corsHeaders(request.headers.get('Origin') || undefined)
    }
  })
}

export async function onRequestPost(ctx: any) {
  return onRequestGet(ctx)
}