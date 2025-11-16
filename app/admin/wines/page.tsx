import Link from "next/link";
import Image from "next/image";
import { Search, Wine, Users } from "lucide-react";
import { getWines } from "@/lib/actions/wines";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminStatGrid } from "@/components/admin/admin-stat-grid";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";

const colorColors = {
  red: "bg-red-100 text-red-800",
  white: "bg-amber-50 text-amber-900",
  rose: "bg-rose-50 text-rose-900",
  orange: "bg-orange-50 text-orange-900",
};

interface WinesPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WinesPage(props: WinesPageProps) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const queryParam =
    typeof searchParams?.q === "string" ? searchParams.q : undefined;
  const query = queryParam?.toLowerCase().trim() ?? "";
  const wines = await getWines();

  const filteredWines = query
    ? wines.filter((wine) => {
        const haystack = [
          wine.wine_name,
          wine.vintage,
          wine.producer?.name,
          wine.handle,
          wine.grape_varieties,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : wines;

  const producerCount = new Set(wines.map((wine) => wine.producer_id)).size;
  const colorBreakdown = wines.reduce<Record<string, number>>((acc, wine) => {
    const key = (wine.color || "Other").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topColor = Object.entries(colorBreakdown).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const lastUpdated = wines.reduce((latest, wine) => {
    const updated = new Date(wine.updated_at).getTime();
    return updated > latest ? updated : latest;
  }, 0);
  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat("sv-SE", {
        month: "short",
        day: "numeric",
      }).format(new Date(lastUpdated))
    : "N/A";

  const statCards = [
    {
      label: "Total wines",
      value: wines.length,
      helper: "In catalog",
      icon: Wine,
    },
    {
      label: "Producers",
      value: producerCount,
      helper: "Represented",
      icon: Users,
    },
    {
      label: "Favorite color",
      value: topColor ? topColor[0] : "–",
      helper: topColor ? `${topColor[1]} listings` : "No data",
    },
    {
      label: "Last update",
      value: lastUpdatedLabel,
      helper: "Most recent edit",
    },
  ];

  return (
    <AdminPageShell
      header={{
        title: "Wines",
        description: "Curate the catalog and keep every bottle consistent.",
        breadcrumbs: [{ label: "Catalog" }, { label: "Wines" }],
        actions: [
          { id: "bulk", label: "Bulk upload", href: "/admin/bulk-upload" },
          { id: "create", label: "Add wine", href: "/admin/wines/new" },
        ],
      }}
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <AdminStatGrid stats={statCards} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Catalog
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              All wines
            </h2>
            <p className="text-sm text-slate-500">
              {filteredWines.length} result{filteredWines.length === 1 ? "" : "s"}
              {query ? ` for “${queryParam}”` : ""}
            </p>
          </div>
          <form
            className="relative w-full max-w-xs"
            action="/admin/wines"
            method="get"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="q"
              defaultValue={queryParam ?? ""}
              placeholder="Search wine, producer, handle…"
              className="pl-9"
            />
          </form>
        </div>

        <div className="space-y-3">
          {filteredWines.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
              No wines match your search.
            </div>
          )}
          {filteredWines.map((wine) => (
            <div
              key={wine.id}
              className="grid gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-300 md:grid-cols-[auto,1fr,auto]"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-slate-100">
                {wine.label_image_path ? (
                  <Image
                    src={wine.label_image_path}
                    alt={`${wine.wine_name} ${wine.vintage}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    No image
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {wine.wine_name} {wine.vintage}
                    </p>
                    <p className="text-sm text-slate-500">
                      {wine.producer?.name ?? "Unknown producer"}
                    </p>
                  </div>
                  {wine.handle && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500">
                      {wine.handle}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  {wine.grape_varieties && (
                    <span>{wine.grape_varieties}</span>
                  )}
                  {wine.alcohol_percentage && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {wine.alcohol_percentage}
                    </span>
                  )}
                  <Badge
                    className={
                      colorColors[wine.color?.toLowerCase() as keyof typeof colorColors] ||
                      "bg-slate-100 text-slate-700"
                    }
                  >
                    {wine.color || "n/a"}
                  </Badge>
                  <span className="font-semibold text-slate-900">
                    {Math.ceil(wine.base_price_cents / 100)} SEK
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-500 md:text-right">
                <div>
                  <p>Updated</p>
                  <p className="font-medium text-slate-900">
                    {new Intl.DateTimeFormat("sv-SE", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(wine.updated_at))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/wines/${wine.id}`}>Edit</Link>
                  </Button>
                  <DeleteWineButton
                    wineId={wine.id}
                    wineName={wine.wine_name}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminPageShell>
  );
}
