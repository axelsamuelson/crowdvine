import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";
import { FulfillmentCostsForm } from "./fulfillment-costs-form";

export const dynamic = "force-dynamic";

export default function FinanceFulfillmentCostsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/admin/finance/utfall">
          <Button
            variant="outline"
            size="sm"
            className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium")}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Tillbaka till Utfall
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fulfillment costs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            GM2-antaganden per order/flaska — frakt, utgående transport,
            inkommande, Stripe, EPR och returreserv. Används i vinslutpris och
            finansscenarier.
          </p>
        </div>
      </div>
      <FulfillmentCostsForm />
    </div>
  );
}
