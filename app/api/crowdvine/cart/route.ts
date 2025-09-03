import { NextResponse } from 'next/server';
import { CartService } from '@/src/lib/cart-service';

export async function GET() {
  try {
    const cart = await CartService.getCart();
    return NextResponse.json(cart);
  } catch (error) {
    console.error('GET /api/crowdvine/cart error:', error);
    return NextResponse.json({ error: 'Failed to get cart' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lines } = body;
    
    if (!lines || !Array.isArray(lines)) {
      return NextResponse.json({ error: 'Invalid lines data' }, { status: 400 });
    }

    // Add each line to cart
    for (const line of lines) {
      const { merchandiseId, quantity = 1 } = line;
      if (!merchandiseId) {
        return NextResponse.json({ error: 'Missing merchandiseId' }, { status: 400 });
      }
      
      // Extract base ID from variant ID (remove -default suffix)
      const baseId = merchandiseId.replace('-default', '');
      
      await CartService.addItem(baseId, quantity);
    }

    const cart = await CartService.getCart();
    return NextResponse.json(cart);
  } catch (error) {
    console.error('POST /api/crowdvine/cart error:', error);
    return NextResponse.json({ error: 'Failed to add items to cart' }, { status: 500 });
  }
}
