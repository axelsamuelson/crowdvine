import { NextRequest, NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.customerEmail || !data.customerName) {
      return NextResponse.json({ error: 'Customer email and name are required' }, { status: 400 });
    }

    const success = await sendGridService.sendWelcomeEmail({
      customerEmail: data.customerEmail,
      customerName: data.customerName,
    });

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Welcome email sent successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send welcome email' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Welcome email API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
