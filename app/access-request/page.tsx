import { supabaseServer } from '@/lib/supabase-server';
import { ensureAccessCookie } from '@/lib/access';
import { redirect } from 'next/navigation';
import { AccessRequestClient } from './access-request-client';

export default async function AccessRequestPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ next?: string }> 
}) {
  const params = await searchParams;
  const next = params?.next || '/';
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  // Smart redirect: if user is logged in and has access, redirect them
  if (user) {
    const { data: prof } = await sb
      .from('profiles')
      .select('access_granted_at')
      .eq('id', user.id)
      .single();
      
    if (prof?.access_granted_at) {
      ensureAccessCookie();
      redirect(next);
    }
  }

  // User doesn't have access or isn't logged in - show access request page
  return <AccessRequestClient />;
}
