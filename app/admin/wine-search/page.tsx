"use client";

import { WineSearchExplorer } from "@/components/wine-search/wine-search-explorer";

export default function AdminWineSearchPage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-zinc-50 py-6 dark:bg-zinc-950">
      <WineSearchExplorer />
    </div>
  );
}
