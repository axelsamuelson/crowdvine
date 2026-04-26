import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Globe2, Plus } from "lucide-react";
import { DeleteShippingRegionButton } from "@/components/admin/delete-shipping-region-button";

type RegionRow = {
  id: string;
  name: string;
  country_code: string;
  description: string | null;
};

export default async function ShippingRegionsPage() {
  const sb = getSupabaseAdmin();

  const { data: regions, error: regErr } = await sb
    .from("shipping_regions")
    .select("id, name, country_code, description")
    .order("name");

  if (regErr) {
    throw new Error(regErr.message);
  }

  const list = (regions ?? []) as RegionRow[];

  const { data: producers, error: prodErr } = await sb
    .from("producers")
    .select("shipping_region_id")
    .not("shipping_region_id", "is", null);

  if (prodErr) {
    throw new Error(prodErr.message);
  }

  const countByRegion = new Map<string, number>();
  for (const row of producers ?? []) {
    const rid = row.shipping_region_id as string | null;
    if (!rid) continue;
    countByRegion.set(rid, (countByRegion.get(rid) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <Globe2 className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Shipping regions
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Group producers for pallet routing (Phase 2.1)
            </p>
          </div>
        </div>
        <Link href="/admin/shipping-regions/new">
          <Button
            size="sm"
            className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add region
          </Button>
        </Link>
      </div>

      {list.length > 0 ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              All regions
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Name, country, producers assigned, and actions
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-900/70 hover:bg-gray-50 dark:hover:bg-zinc-900/70 border-b border-gray-200 dark:border-zinc-800">
                  <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Country
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Description
                  </TableHead>
                  <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Producers
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => {
                  const pc = countByRegion.get(r.id) ?? 0;
                  return (
                    <TableRow
                      key={r.id}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800/50"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-zinc-100">
                        {r.name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-zinc-300 font-mono">
                        {r.country_code}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600 dark:text-zinc-400 max-w-md truncate">
                        {r.description || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-zinc-300">
                        {pc}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Link href={`/admin/shipping-regions/${r.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
                            >
                              Edit
                            </Button>
                          </Link>
                          <DeleteShippingRegionButton
                            regionId={r.id}
                            regionName={r.name}
                            producerCount={pc}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] flex flex-col items-center justify-center py-12">
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
            No shipping regions yet
          </p>
          <Link href="/admin/shipping-regions/new">
            <Button
              size="sm"
              className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add your first region
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
