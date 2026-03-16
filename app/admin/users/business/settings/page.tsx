import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceSenderDefaultsForm } from "./invoice-sender-defaults-form";

export const metadata = {
  title: "Business · Inställningar",
  description: "Standarduppgifter för fakturering (avsändare)",
};

export default function BusinessSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white">
          <Link href="/admin/users/business">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inställningar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Företagets uppgifter som används som standard när du skapar en ny faktura (avsändare / Från).
          </p>
        </div>
      </div>
      <InvoiceSenderDefaultsForm />
    </div>
  );
}
