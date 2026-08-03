import { listMetricExcludedProfiles } from "@/lib/actions/metrics-exclusions";
import { ExkluderadeProfilerClient } from "./exkluderade-profiler-client";

export default async function ExkluderadeProfilerPage() {
  const rows = await listMetricExcludedProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Exkluderade profiler
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
          Profiler som inte räknas i vanlig analytics och objective metrics
        </p>
      </div>
      <ExkluderadeProfilerClient initialRows={rows} />
    </div>
  );
}
