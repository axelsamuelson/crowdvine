import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  groupTrackedEventsByCategory,
  TRACKED_EVENTS_CATEGORY_LABEL,
  TRACKED_EVENTS_CATEGORY_ORDER,
  type TrackedEventCatalogEntry,
} from "@/lib/analytics/tracked-events-catalog";

export const dynamic = "force-dynamic";

function formatSources(entry: TrackedEventCatalogEntry) {
  const labels = entry.sources.map((s) =>
    s === "client" ? "Client (browser)" : "Server (API)",
  );
  return labels.join(" · ");
}

export default function AnalyticsSettingsPage() {
  const byCategory = groupTrackedEventsByCategory();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
            <Settings className="size-5 shrink-0" aria-hidden />
            <span className="text-sm font-medium">Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-2xl">
            Reference list of{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
              event_type
            </code>{" "}
            values written to{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
              user_events
            </code>
            . Defined in{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
              lib/analytics/event-tracker.ts
            </code>
            .
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="shrink-0 border-gray-200 dark:border-zinc-700"
        >
          <Link href="/admin/analytics">
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            Back to Analytics
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        {TRACKED_EVENTS_CATEGORY_ORDER.map((category) => {
          const rows = byCategory.get(category) ?? [];
          if (rows.length === 0) return null;

          return (
            <section
              key={category}
              className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]"
            >
              <div className="border-b border-gray-200 px-4 py-3 dark:border-[#1F1F23]">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {TRACKED_EVENTS_CATEGORY_LABEL[category]}
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
                  Category:{" "}
                  <code className="rounded bg-gray-100 px-1 dark:bg-zinc-800">
                    {category}
                  </code>
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-[#1F1F23] hover:bg-transparent">
                    <TableHead className="text-gray-700 dark:text-zinc-300 w-[28%]">
                      Event
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-zinc-300">
                      Description
                    </TableHead>
                    <TableHead className="text-gray-700 dark:text-zinc-300 w-[22%]">
                      Source
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.eventType}
                      className="border-gray-200 dark:border-[#1F1F23]"
                    >
                      <TableCell className="align-top font-mono text-xs text-gray-900 dark:text-zinc-100">
                        {row.eventType}
                      </TableCell>
                      <TableCell className="align-top text-sm text-gray-700 dark:text-zinc-300">
                        {row.description}
                      </TableCell>
                      <TableCell className="align-top text-xs text-gray-600 dark:text-zinc-400">
                        {formatSources(row)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          );
        })}
      </div>
    </div>
  );
}
