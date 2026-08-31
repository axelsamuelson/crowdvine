import { Truck } from "lucide-react";
import { FreightCatalogueManager } from "@/components/admin/freight-catalogue-manager";
import { CustomerShippingRatesPanel } from "@/components/admin/customer-shipping-rates-panel";

export default function FreightAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
          <Truck className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fraktalternativ
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 max-w-2xl">
            Hantera inbound- och outbound-leverantörer, rates och kundens
            fraktpris. Historiska quotes fryses — rate-card-ändringar påverkar
            inte tidigare pall- eller orderquotes.
          </p>
        </div>
      </div>

      <CustomerShippingRatesPanel />
      <FreightCatalogueManager />
    </div>
  );
}
