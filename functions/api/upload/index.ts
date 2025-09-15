// Cloudflare Pages Function - File Upload
// Handle file uploads

export async function onRequestPost(context: any) {
  const { request } = context
  
  try {
    // Check for access cookie
    const cookie = request.headers.get('Cookie') || ''
    const hasAccess = cookie.includes('cv-access=1')
    
    if (!hasAccess) {
      return new Response(JSON.stringify({
        error: 'Authentication required for upload'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response(JSON.stringify({
        error: 'No file uploaded'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // For now, return a mock upload response
    // TODO: Implement actual file upload to Supabase Storage or R2
    return new Response(JSON.stringify({
      message: 'File uploaded successfully',
      url: `https://example.com/uploads/${file.name}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return new Response(JSON.stringify({
      error: 'Upload failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}