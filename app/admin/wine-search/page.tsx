"use client";

import { WineSearchExplorer } from "@/components/wine-search/wine-search-explorer";

/** Hitta vin — same PACT admin shell (sidebar/layout) as other /admin pages. */
export default function AdminWineSearchPage() {
  return (
    <div className="space-y-6">
      <WineSearchExplorer />
    </div>
  );
}
