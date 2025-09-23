import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  try {
    const resolvedParams = await params;
    const { path } = resolvedParams;

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get the file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .download(path);

    if (error) {
      console.error('Error downloading file:', error);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Convert blob to buffer
    const buffer = await data.arrayBuffer();
    
    // Determine content type based on file extension
    const extension = path.split('.').pop()?.toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    switch (extension) {
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
    }

    // Return the image with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
