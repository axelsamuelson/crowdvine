import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AccessRequestClient } from "./access-request-client";

export default async function AccessRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next || "/";
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  // Smart redirect: if user is logged in and has access, redirect them
  if (user) {
    const { data: membership } = await sb
      .from("user_memberships")
      .select("level")
      .eq("user_id", user.id)
      .maybeSingle();

    // If user has membership and is not a requester, they have access
    if (membership && membership.level !== 'requester') {
      redirect(next);
    }
  }

  // User doesn't have access or isn't logged in - show access request page
  return <AccessRequestClient />;
}
