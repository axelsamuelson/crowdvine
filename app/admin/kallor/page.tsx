import { Warehouse } from "lucide-react";
import { KallorSourcesTable } from "@/components/admin/kallor-sources-table";
import { listKallorSources } from "@/lib/admin/kallor-sources";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminKallorPage() {
  const sources = await listKallorSources(getSupabaseAdmin());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
            <Warehouse className="h-5 w-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Källor
            </h1>
            <p className="max-w-xl text-sm text-gray-600 dark:text-zinc-400">
              Producenter och grossister med aktiva viner. Kontaktmejl, adress och
              språk används för framtida källmejl (strömbrytare AV tills mallar
              godkänts).
            </p>
          </div>
        </div>
      </div>

      <KallorSourcesTable sources={sources} />
    </div>
  );
}
