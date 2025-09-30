import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    console.log("🧪 Test API route called");
    
    const body = await request.json();
    console.log("🧪 Request body:", body);
    
    return NextResponse.json({ 
      success: true, 
      message: "Test API route works",
      receivedData: body
    });
  } catch (error) {
    console.error("🧪 Test API error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
