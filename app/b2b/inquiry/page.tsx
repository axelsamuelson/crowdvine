import { redirect } from "next/navigation";
import { isDirtywineInquiryMode } from "@/lib/b2b/flags";
import { B2bInquiryClient } from "./inquiry-client";

export const metadata = {
  title: "Beställningsförfrågan | Dirtywine",
  description: "Skicka en B2B-förfrågan för viner från lagret.",
  robots: { index: false, follow: false },
};

export default function B2bInquiryPage() {
  if (!isDirtywineInquiryMode()) {
    redirect("/checkout");
  }
  return <B2bInquiryClient />;
}
