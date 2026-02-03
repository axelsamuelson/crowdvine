import { FranceTopoMap } from "@/components/map-topo/france-topo-map";
import { MapTopoThemeToggle } from "@/components/map-topo/theme-toggle";
import { MapTopoShell } from "@/components/map-topo/shell";

export default function MapTopoPage() {
  return (
    <MapTopoShell defaultTheme="dark">
      <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-mono font-bold tracking-tight">
                france_map.interactive
              </h1>
              <p className="text-sm font-mono text-muted-foreground">
                click a region → departments → appellations
              </p>
            </div>
            <MapTopoThemeToggle />
          </div>

          <div className="w-full h-[800px] rounded-lg border border-border bg-card overflow-hidden">
            <FranceTopoMap />
          </div>
        </div>
      </main>
    </MapTopoShell>
  );
}

