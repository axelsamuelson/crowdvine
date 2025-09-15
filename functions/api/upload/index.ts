// Cloudflare Pages Function - File Upload
// Handle file uploads to R2 or Supabase Storage

import { success, error, badRequest, unauthorized, internalError, corsHeaders } from '../_lib/response'
import { getUserFromRequest } from '../_lib/supabase'

export async function onRequestPost(ctx: any) {
  const { request, env } = ctx
  
  try {
    const userId = getUserFromRequest(request)
    
    if (!userId) {
      return unauthorized('Authentication required')
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return badRequest('No file provided')
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      return badRequest('Invalid file type. Only images are allowed.')
    }

    if (file.size > maxSize) {
      return badRequest('File too large. Maximum size is 5MB.')
    }

    // For now, return a signed URL for Supabase Storage
    // In production, this would generate a signed URL for R2 or Supabase Storage
    const fileName = `${userId}/${Date.now()}-${file.name}`
    
    // This is a placeholder - in production you would:
    // 1. Generate a signed URL for R2 or Supabase Storage
    // 2. Return the URL to the client
    // 3. Client uploads directly to the storage service
    
    const uploadUrl = `https://storage.example.com/uploads/${fileName}`

    const response = success({
      uploadUrl,
      fileName,
      fileType: file.type,
      fileSize: file.size
    }, 'Upload URL generated')

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Upload error:', err)
    return internalError('Upload failed')
  }
}

export async function onRequestOptions(ctx: any) {
  const { request } = ctx
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('Origin') || undefined)
  })
}