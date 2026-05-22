import GeoZoneForm from "@/components/admin/geo-zone-form";
import { Globe2 } from "lucide-react";
import Link from "next/link";

export default function NewGeoZonePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/admin/geo-zones"
          className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200"
        >
          ← Tillbaka till vinzoner
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ny vinzon & leverans
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Land + stad för kunden. Leveranszon med samma namn skapas vid spara.
            </p>
          </div>
        </div>
      </div>
      <GeoZoneForm />
    </div>
  );
}
