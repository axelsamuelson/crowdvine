import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isDirtywineInquiryMode } from "@/lib/b2b/flags";
import { loadB2bInquiryPrefill } from "@/lib/b2b/inquiry-prefill";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { B2bInquiryClient } from "./inquiry-client";

export const metadata = {
  title: "Beställningsförfrågan | Dirtywine",
  description: "Skicka en B2B-förfrågan för viner från lagret.",
  robots: { index: false, follow: false },
};

export default async function B2bInquiryPage() {
  if (!isDirtywineInquiryMode()) {
    redirect("/checkout");
  }
  const user = await getCurrentUser();
  const prefill = user
    ? await loadB2bInquiryPrefill(getSupabaseAdmin(), user)
    : null;

  return (
    <Suspense fallback={null}>
      <B2bInquiryClient
        isAuthenticated={Boolean(user)}
        prefill={prefill}
      />
    </Suspense>
  );
}
