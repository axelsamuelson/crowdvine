import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { redirect } from "next/navigation";
import { BookingsTabNav } from "@/components/admin/bookings/bookings-tab-nav";
import { DirtyWineContent } from "./dirty-wine-content";

export const metadata = {
  title: "Dirty Wine · B2B Orders & Invoices",
  description: "B2B orders from dirtywine.se, offline orders and invoice generator",
};

export default async function DirtyWinePage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin-auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dirty Wine · B2B — ordrar från dirtywine.se, offline-ordrar och fakturor
        </p>
      </div>

      <BookingsTabNav />

      <DirtyWineContent />
    </div>
  );
}
