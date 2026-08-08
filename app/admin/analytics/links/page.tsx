import Link from "next/link";
import { ArrowLeft, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UtmLinkBuilder } from "./utm-link-builder";

export const dynamic = "force-dynamic";

export default function AnalyticsLinksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
            <Link2 className="size-5 shrink-0" aria-hidden />
            <span className="text-sm font-medium">Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            UTM link builder
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-2xl">
            Build tagged URLs with consistent{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
              utm_source
            </code>
            ,{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
              utm_medium
            </code>
            , and{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
              utm_campaign
            </code>
            . Sessions show up under the matching channel and campaign in
            Trafik.
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

      <UtmLinkBuilder />
    </div>
  );
}
