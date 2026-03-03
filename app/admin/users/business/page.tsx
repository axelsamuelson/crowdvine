import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceRecipientsManager } from "@/components/admin/invoice-recipients-manager";

export const metadata = {
  title: "Business · Företag",
  description: "Hantera företagsprofiler för fakturering (B2B)",
};

export default function AdminBusinessPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business</h1>
            <p className="text-sm text-gray-600 mt-1">
              Företagsprofiler för fakturering. Välj företag när du skapar fakturor under Bookings → Dirty Wine.
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/users/business/settings">
            <Settings className="h-4 w-4 mr-2" />
            Inställningar
          </Link>
        </Button>
      </div>
      <InvoiceRecipientsManager />
    </div>
  );
}
