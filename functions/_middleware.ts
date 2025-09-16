// Cloudflare Pages Functions - Development Environment
// This middleware handles access control for development

export async function onRequest(context: any) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // Allow all requests in development
  // In production, this would check for cv-access cookie
  console.log(`[DEV] Allowing request to: ${url.pathname}`);
  
  return next();
}