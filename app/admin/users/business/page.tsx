import Link from "next/link";
import { ArrowLeft, Building2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceRecipientsManager } from "@/components/admin/invoice-recipients-manager";

export const metadata = {
  title: "Business · Företag",
  description: "Hantera företagsprofiler för fakturering (B2B)",
};

export default function AdminBusinessPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800/50">
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-gray-500 dark:text-zinc-400">
            Företagsprofiler för fakturering (Bookings → Dirty Wine)
          </span>
        </div>
        <Button variant="outline" size="sm" asChild className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-zinc-100">
          <Link href="/admin/users/business/settings">
            <Settings className="h-4 w-4 mr-2" />
            Inställningar
          </Link>
        </Button>
      </div>

      {/* Same card structure as /admin dashboard */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          Business
        </h2>
        <div className="flex-1">
          <InvoiceRecipientsManager />
        </div>
      </div>
    </div>
  );
}
