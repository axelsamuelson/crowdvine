import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST() {
  // MVP: generera ett cartId i session-cookie-klassen (clienten lagrar id)
  const cart = { id: randomUUID(), checkoutUrl: '/checkout' };
  return NextResponse.json(cart);
}
