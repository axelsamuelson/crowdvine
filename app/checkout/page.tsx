import { redirect } from "next/navigation";
import { CheckoutClient } from "./checkout-client";
import { isPlatformOpen } from "@/lib/platform-open";
import { isDirtywineInquiryMode } from "@/lib/b2b/flags";
import { getIsDirtywineSiteFromHeaders } from "@/lib/b2b-site-server";

export default async function CheckoutPage() {
  // Dirtywine inquiry mode: keep checkout-client intact, route B2B hosts to inquiry.
  if (isDirtywineInquiryMode() && (await getIsDirtywineSiteFromHeaders())) {
    redirect("/b2b/inquiry");
  }
  return <CheckoutClient platformOpen={isPlatformOpen()} />;
}
