"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQueryState, parseAsString } from "nuqs";
import { Search, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteProducerButton } from "@/components/admin/delete-producer-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminProducerListItem = {
  id: string;
  name: string;
  region: string;
  country_code: string;
  address_street: string;
  address_city: string;
  address_postcode: string;
  short_description: string;
  pickup_zone_id?: string | null;
  is_live?: boolean;
  contact_email?: string | null;
  contact_phone?: string | null;
};

type Props = {
  producers: AdminProducerListItem[];
  countryNameByCode: Record<string, string>;
  pickupZoneNameById: Record<string, string>;
};

export function AdminProducersContent({
  producers,
  countryNameByCode,
  pickupZoneNameById,
}: Props) {
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );

  const filteredProducers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return producers;

    return producers.filter((p) => {
      const countryLabel = p.country_code
        ? (
            countryNameByCode[p.country_code] || p.country_code
          ).toLowerCase()
        : "";
      const pickupLabel = p.pickup_zone_id
        ? (pickupZoneNameById[p.pickup_zone_id] || "").toLowerCase()
        : "";
      const haystack = [
        p.name,
        p.region,
        p.country_code,
        countryLabel,
        p.address_street,
        p.address_city,
        p.address_postcode,
        p.short_description,
        p.contact_email,
        p.contact_phone,
        pickupLabel,
        p.is_live === false ? "offline" : "live",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [producers, searchQuery, countryNameByCode, pickupZoneNameById]);

  const hasSearch = searchQuery.trim().length > 0;

  if (producers.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23] flex flex-col items-center justify-center py-12">
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">
          No producers found
        </p>
        <Link href="/admin/producers/new">
          <Button
            size="sm"
            className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add your first producer
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-4 dark:border-[#1F1F23] dark:bg-zinc-900/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-400" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök producent, region, land, adress…"
              className="h-10 rounded-lg border-gray-200 bg-white pl-9 text-gray-900 placeholder:text-gray-500 sm:h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
              aria-label="Sök producenter"
            />
          </div>
          {hasSearch ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-full shrink-0 gap-1 rounded-lg text-gray-600 hover:text-gray-900 sm:h-9 sm:w-auto dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3.5 w-3.5" />
              Rensa sök
            </Button>
          ) : null}
        </div>
        {hasSearch ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
            Visar {filteredProducers.length} av {producers.length} producenter
          </p>
        ) : null}
      </div>

      {filteredProducers.length === 0 ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-8 border border-gray-200 dark:border-[#1F1F23] text-center">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Inga producenter matchade sökningen.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 rounded-lg text-xs"
            onClick={() => setSearchQuery("")}
          >
            Rensa sök
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              All Producers
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              {hasSearch
                ? `Visar ${filteredProducers.length} av ${producers.length} producenter`
                : "Complete list of all producers"}
            </p>
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
                {filteredProducers.map((producer) => {
                  const bio = producer.short_description?.trim() || "";
                  return (
                    <TableRow
                      key={producer.id}
                      className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800/50"
                    >
                      <TableCell className="max-w-0">
                        <div className="min-w-0 flex items-center gap-2">
                          <div className="min-w-0 font-medium text-gray-900 dark:text-zinc-100 truncate">
                            {producer.name}
                          </div>
                          {producer.is_live === false ? (
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
                        <span className="block truncate">
                          {producer.region || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-0 text-sm text-gray-700 dark:text-zinc-300">
                        <span className="block truncate">
                          {producer.country_code
                            ? countryNameByCode[producer.country_code] ??
                              producer.country_code
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-0 text-sm text-gray-700 dark:text-zinc-300">
                        <div className="min-w-0">
                          <div className="truncate">
                            {producer.address_street || "—"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {producer.address_city || "—"}
                            {producer.address_postcode
                              ? `, ${producer.address_postcode}`
                              : ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-0 text-sm text-gray-700 dark:text-zinc-300">
                        <span className="block truncate">
                          {producer.pickup_zone_id
                            ? pickupZoneNameById[producer.pickup_zone_id] ||
                              "—"
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="sticky right-0 z-10 w-[148px] bg-white text-right group-hover:bg-gray-50 dark:bg-[#0F0F12] dark:group-hover:bg-zinc-800/50">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/producers/${producer.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
                            >
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
    </div>
  );
}
