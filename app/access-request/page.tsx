import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { shouldShowNoB2bAccessMessage } from "@/lib/access-request/no-b2b";
import { supabaseServer } from "@/lib/supabase-server";
import { AccessRequestClient } from "./access-request-client";

export default async function AccessRequestPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    redirectedFrom?: string;
    reason?: string;
    b2b?: string;
  }>;
}) {
  const params = await searchParams;
  const next = params?.next || params?.redirectedFrom || "/";
  const reason = params?.reason;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const showNoB2b = shouldShowNoB2bAccessMessage({
    reason,
    host,
    searchParams: {
      get: (key) => {
        if (key === "b2b") return params?.b2b ?? null;
        if (key === "reason") return reason ?? null;
        return null;
      },
    },
  });

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  // Smart redirect: if user is logged in and has access, redirect them.
  // Exception: Dirty Wine no_b2b state (PACT member without business portal).
  if (user && !showNoB2b) {
    const { data: membership } = await sb
      .from("user_memberships")
      .select("level")
      .eq("user_id", user.id)
      .maybeSingle();

    // If user has membership and is not a requester, they have access
    if (membership && membership.level !== "requester") {
      redirect(next);
    }
  }

  return (
    <AccessRequestClient
      reason={reason}
      showNoB2bFromServer={showNoB2b}
    />
  );
}
