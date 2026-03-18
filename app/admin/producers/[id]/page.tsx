import Link from "next/link";
import Image from "next/image";
import { getProducer } from "@/lib/actions/producers";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import ProducerForm from "@/components/admin/producer-form";
import { DeleteProducerButton } from "@/components/admin/delete-producer-button";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { RelatedTasksCard } from "@/components/admin/operations/related-tasks-card";
import { getTasksForEntity } from "@/lib/actions/operations-entity";
import { notFound } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Wine, Plus } from "lucide-react";

interface EditProducerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProducerPage({
  params,
}: EditProducerPageProps) {
  try {
    const { id } = await params;
    const sb = getSupabaseAdmin();

    const [producer, relatedTasks, projectsRes, objectivesRes, adminsRes, winesResult] =
      await Promise.all([
        getProducer(id),
        getTasksForEntity("producer", id),
        sb.from("admin_projects")
          .select("id, name")
          .is("deleted_at", null)
          .eq("status", "active")
          .order("name"),
        sb.from("admin_objectives")
          .select("id, title")
          .is("deleted_at", null)
          .eq("status", "active")
          .order("title"),
        sb.from("profiles")
          .select("id, email")
          .eq("role", "admin")
          .order("email"),
        sb
          .from("wines")
          .select("id, wine_name, vintage, handle, base_price_cents, is_live, label_image_path")
          .eq("producer_id", id)
          .order("wine_name", { ascending: true }),
      ]);

    const projects = projectsRes.data ?? [];
    const objectives = objectivesRes.data ?? [];
    const admins = adminsRes.data ?? [];

    let winesData = winesResult;

    if (winesData.error && /is_live|column.*does not exist/i.test(winesData.error.message ?? "")) {
      const fallback = await sb
        .from("wines")
        .select("id, wine_name, vintage, handle, base_price_cents, label_image_path")
        .eq("producer_id", id)
        .order("wine_name", { ascending: true });
      winesData = fallback as typeof winesResult;
    }

    const wines = (winesData.data ?? []) as Array<{
      id: string;
      wine_name: string;
      vintage: string;
      handle: string;
      base_price_cents: number;
      is_live?: boolean;
      label_image_path?: string | null;
    }>;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
              <Wine className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Producer</h1>
              <p className="text-sm text-gray-600 dark:text-zinc-400">Update producer information</p>
            </div>
          </div>
          <DeleteProducerButton
            producerId={producer.id}
            producerName={producer.name}
          />
        </div>

        <ProducerForm producer={producer} />

        <RelatedTasksCard
          entity_type="producer"
          entity_id={id}
          entity_label={producer.name}
          tasks={relatedTasks}
          projects={projects}
          objectives={objectives}
          admins={admins}
        />

        <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Viner</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Alla viner som tillhör denna producent ({wines.length} st)
              </p>
            </div>
            <Link href={`/admin/wines/new?producer_id=${id}`}>
              <Button size="sm" className="rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Lägg till vin
              </Button>
            </Link>
          </div>
          <div className="p-6">
            {wines.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400 py-4">
                Inga viner kopplade till denna producent.{" "}
                <Link href={`/admin/wines/new?producer_id=${id}`} className="text-gray-900 dark:text-zinc-100 underline font-medium">
                  Lägg till vin
                </Link>
              </p>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-zinc-900/70 hover:bg-gray-50 dark:hover:bg-zinc-900/70 border-b border-gray-200 dark:border-zinc-800">
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400 w-20">Bild</TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Namn</TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Vintage</TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Handle</TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Pris</TableHead>
                      <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Status</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-600 dark:text-zinc-400">Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wines.map((wine) => (
                      <TableRow key={wine.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800/50">
                        <TableCell className="w-20 p-2">
                          <div className="relative w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={wine.label_image_path || DEFAULT_WINE_IMAGE_PATH}
                              alt={`${wine.wine_name} ${wine.vintage}`}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-zinc-100">
                          {wine.wine_name}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 dark:text-zinc-300">
                          {wine.vintage || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 dark:text-zinc-300 font-mono">
                          {wine.handle || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 dark:text-zinc-300">
                          {wine.base_price_cents != null
                            ? `${(wine.base_price_cents / 100).toFixed(0)} kr`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {"is_live" in wine && wine.is_live === false ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              Offline
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              Live
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/wines/${wine.id}`}>
                            <Button variant="outline" size="sm" className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700">
                              Redigera
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
