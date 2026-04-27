import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { redirect } from "next/navigation";
import { DirtyWineContent } from "@/app/admin/bookings/dirty-wine/dirty-wine-content";

export const metadata = {
  title: "B2B Orders",
  description:
    "B2B orders from dirtywine.se, offline orders and invoice generator",
};

export default async function B2bOrdersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin-auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">B2B Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dirty Wine · B2B — ordrar från dirtywine.se, offline-ordrar och fakturor
        </p>
      </div>

      <DirtyWineContent />
    </div>
  );
}
