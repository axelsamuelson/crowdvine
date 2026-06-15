import Link from "next/link";
import { getProducers } from "@/lib/actions/producers";
import { extractWineText } from "@/lib/i18n/wine-locale";
import { Button } from "@/components/ui/button";
import { DeleteProducerButton } from "@/components/admin/delete-producer-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Wine, Plus, Users } from "lucide-react";

export default async function ProducersPage() {
  const producers = await getProducers();
  const sb = getSupabaseAdmin();

  const { data: countries } = await sb
    .from("countries")
    .select("code, name");
  const countryNameByCode = new Map<string, string>();
  (countries ?? []).forEach((c: { code: string; name: string }) => {
    countryNameByCode.set(c.code, c.name);
  });

  const pickupZoneIds = Array.from(
    new Set(
      producers
        .map((p: any) => p.pickup_zone_id)
        .filter((id: any) => typeof id === "string" && id.length > 0),
    ),
  ) as string[];

  const pickupZoneNameById = new Map<string, string>();
  if (pickupZoneIds.length > 0) {
    const { data: zones } = await sb
      .from("pallet_zones")
      .select("id, name")
      .in("id", pickupZoneIds);
    (zones || []).forEach((z: any) => pickupZoneNameById.set(z.id, z.name));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <Wine className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Producers</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">Manage wine producers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/producer-groups">
            <Button variant="outline" size="sm" className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Producer Groups
            </Button>
          </Link>
          <Link href="/admin/producers/new">
            <Button size="sm" className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Producer
            </Button>
          </Link>
        </div>
      </div>

      {producers.length > 0 && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Producers</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Complete list of all producers</p>
          </div>
          <div className="min-w-0">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-900/70 hover:bg-gray-50 dark:hover:bg-zinc-900/70 border-b border-gray-200 dark:border-zinc-800">
                  <TableHead className="w-[min(280px,32%)] text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Producer
                  </TableHead>
                  <TableHead className="w-[14%] text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Region
                  </TableHead>
                  <TableHead className="hidden md:table-cell w-[12%] text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Country
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-[18%] text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Address
                  </TableHead>
                  <TableHead className="hidden xl:table-cell w-[12%] text-xs font-medium text-gray-600 dark:text-zinc-400">
                    Pall
                  </TableHead>
                  <TableHead className="sticky right-0 z-10 w-[148px] bg-gray-50 text-right text-xs font-medium text-gray-600 dark:bg-zinc-900/70 dark:text-zinc-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {producers.map((producer) => {
                  const bio = extractWineText(
                    producer.short_description as
                      | Record<string, string>
                      | string
                      | null,
                    "sv",
                  );
                  return (
                  <TableRow key={producer.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800/50">
                    <TableCell className="max-w-0">
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="min-w-0 font-medium text-gray-900 dark:text-zinc-100 truncate">
                          {producer.name}
                        </div>
                        {(producer as any).is_live === false ? (
                          <span className="inline-flex shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            Offline
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            Live
                          </span>
                        )}
                      </div>
                      {bio ? (
                        <p
                          className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-zinc-400 break-words"
                          title={bio}
                        >
                          {bio}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-0 text-sm text-gray-700 dark:text-zinc-300">
                      <span className="block truncate">{producer.region || "—"}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-0 text-sm text-gray-700 dark:text-zinc-300">
                      <span className="block truncate">
                        {producer.country_code
                          ? countryNameByCode.get(producer.country_code) ?? producer.country_code
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-0 text-sm text-gray-700 dark:text-zinc-300">
                      <div className="min-w-0">
                        <div className="truncate">{producer.address_street || "—"}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                          {producer.address_city || "—"}
                          {producer.address_postcode ? `, ${producer.address_postcode}` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell max-w-0 text-sm text-gray-700 dark:text-zinc-300">
                      <span className="block truncate">
                        {producer.pickup_zone_id
                          ? pickupZoneNameById.get(producer.pickup_zone_id) || "—"
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 w-[148px] bg-white text-right group-hover:bg-gray-50 dark:bg-[#0F0F12] dark:group-hover:bg-zinc-800/50">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/producers/${producer.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700">
                            Edit
                          </Button>
                        </Link>
                        <DeleteProducerButton
                          producerId={producer.id}
                          producerName={producer.name}
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
      )}

      {producers.length === 0 && (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] flex flex-col items-center justify-center py-12">
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">No producers found</p>
          <Link href="/admin/producers/new">
            <Button size="sm" className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add your first producer
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
