import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { redirect } from "next/navigation";
import { B2bInquiriesAdminClient } from "./b2b-inquiries-client";

export const metadata = {
  title: "B2B-förfrågningar",
  description: "Dirtywine B2B order inquiries",
};

export default async function B2bInquiriesAdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin-auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">B2B-förfrågningar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dirtywine · beställningsförfrågningar (lager). Ändra status till
          bekräftad eller avböjd.
        </p>
      </div>
      <B2bInquiriesAdminClient />
    </div>
  );
}
