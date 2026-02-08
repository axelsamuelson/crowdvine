import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/bookings?tab=dirty-wine">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dirty Wine · B2B</h1>
          <p className="text-sm text-gray-600 mt-1">
            Ordrar från dirtywine.se, offline-ordrar och fakturor
          </p>
        </div>
      </div>

      <DirtyWineContent />
    </div>
  );
}
