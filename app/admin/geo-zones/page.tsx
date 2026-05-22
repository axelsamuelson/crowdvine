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
import { getCountryDisplayName } from "@/lib/countries";

const ELIG_LABELS: Record<string, string> = {
  normal_checkout: "Vanlig utcheckning",
  conditional_reservation: "Villkorad reservation",
  interest_only: "Endast intresse",
  browse_only: "Endast bläddra",
  disabled: "Inaktiverad",
};

type DeliveryEmbed = {
  id: string;
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
} | null;

type GeoRow = {
  id: string;
  market_code: string;
  country_code: string;
  region_code: string | null;
  city: string | null;
  name: string;
  display_name: string;
  zone_type: string;
  eligibility_status: string;
  currency_code: string | null;
  is_active: boolean;
  sort_order: number;
  default_delivery_zone_id: string | null;
  delivery_zone: DeliveryEmbed | DeliveryEmbed[] | null;
};

function normalizeDelivery(
  raw: GeoRow["delivery_zone"],
): DeliveryEmbed | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

export default async function GeoZonesAdminPage() {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("geo_zones")
    .select(
      `
      id, market_code, country_code, region_code, city, name, display_name,
      zone_type, eligibility_status, currency_code, is_active, sort_order,
      default_delivery_zone_id,
      delivery_zone:pallet_zones!geo_zones_default_delivery_zone_id_fkey (
        id, name, radius_km, center_lat, center_lon
      )
    `,
    )
    .order("market_code")
    .order("sort_order")
    .order("display_name");

  if (error) {
    const fallback = await sb
      .from("geo_zones")
      .select(
        "id, market_code, country_code, region_code, city, name, display_name, zone_type, eligibility_status, currency_code, is_active, sort_order, default_delivery_zone_id",
      )
      .order("market_code")
      .order("sort_order")
      .order("display_name");
    if (fallback.error) throw new Error(fallback.error.message);
    const rows = (fallback.data ?? []) as GeoRow[];
    return renderPage(rows, true);
  }

  const rows = (data ?? []) as GeoRow[];
  return renderPage(rows, false);
}

function renderPage(rows: GeoRow[], embedFailed: boolean) {
  const withDelivery = rows.filter((r) => r.default_delivery_zone_id).length;
  const customerVisible = rows.filter(
    (r) => r.is_active && r.eligibility_status !== "disabled" && (r.city ?? "").trim(),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <Globe2 className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Vinzoner & leverans
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400 max-w-2xl">
              En rad = en kundzon (land + stad) och dess leveranszon med samma namn.
              Redigera här — inte under upphämtningszoner.
            </p>
          </div>
        </div>
        <Link href="/admin/geo-zones/new">
          <Button
            size="sm"
            className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Ny zon
          </Button>
        </Link>
      </div>

      {embedFailed ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
          Leveransdetaljer kunde inte laddas (kör migration 156). Kopplingsstatus visas
          ändå.
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4">
          <p className="text-xs text-gray-500 dark:text-zinc-400">Vinzoner totalt</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
            {rows.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4">
          <p className="text-xs text-gray-500 dark:text-zinc-400">Synliga för kund</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
            {customerVisible}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4">
          <p className="text-xs text-gray-500 dark:text-zinc-400">Med leverans kopplad</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
            {withDelivery}
          </p>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="border-b border-gray-200 dark:border-[#1F1F23] px-5 py-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Kolumnen <span className="font-medium text-foreground">Zon</span> är
              vad kunden ser. Leveransradie uppdateras när du sparar (geokodning på
              stad).
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-zinc-900/70">
                  <TableHead className="text-xs">Zon (kund)</TableHead>
                  <TableHead className="text-xs">Land · stad</TableHead>
                  <TableHead className="text-xs">Checkout</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Valuta</TableHead>
                  <TableHead className="text-xs">Leverans (pall)</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-right text-xs">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const delivery = normalizeDelivery(r.delivery_zone);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-zinc-100">
                          {r.display_name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          Vinzon + leverans · samma namn
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {getCountryDisplayName(r.country_code, "sv")}
                        <span className="block text-xs text-muted-foreground">
                          {[r.region_code, r.city].filter(Boolean).join(" · ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {ELIG_LABELS[r.eligibility_status] ?? r.eligibility_status}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs">
                        {r.currency_code ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {delivery ? (
                          <span>
                            {delivery.radius_km} km radie
                            <span className="block text-[11px] text-muted-foreground font-mono">
                              {delivery.center_lat.toFixed(2)},{" "}
                              {delivery.center_lon.toFixed(2)}
                            </span>
                          </span>
                        ) : r.default_delivery_zone_id ? (
                          <span className="text-muted-foreground">Kopplad</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            Sparas vid nästa redigering
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            r.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {r.is_active ? "Aktiv" : "Av"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/geo-zones/${r.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            Redigera
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-gray-500">
          Inga zoner ännu. Skapa en med land och stad.
        </div>
      )}
    </div>
  );
}
