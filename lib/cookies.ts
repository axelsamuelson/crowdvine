import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

export async function getOrSetCartId() {
  const jar = await cookies();
  let id = jar.get('cv_cart_id')?.value;
  if (!id) {
    id = randomUUID();
    jar.set('cv_cart_id', id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60*60*24*90
    });
  }
  return id;
}
