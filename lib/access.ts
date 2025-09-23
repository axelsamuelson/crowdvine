import { cookies } from 'next/headers';

export async function ensureAccessCookie() {
  const jar = await cookies();
  const v = jar.get('cv-access')?.value;
  if (v !== '1') {
  jar.set('cv-access', '1', { 
    httpOnly: true, 
    sameSite: 'lax', // Changed from 'strict' to 'lax' for better incognito support
    path: '/', 
    maxAge: 60*60*24*365, // 1 year
    secure: process.env.NODE_ENV === 'production',
    domain: process.env.NODE_ENV === 'production' ? '.pactwines.com' : undefined
  });
  }
}

// Server action for setting access cookie
export async function setAccessCookieAction() {
  "use server";
  await ensureAccessCookie();
}
