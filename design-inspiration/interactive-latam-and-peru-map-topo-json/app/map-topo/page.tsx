import { FranceMap } from "@/components/france-map"
import { ThemeToggle } from "@/components/theme-toggle"

export default function MapTopoPage() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <a
              href="https://hack0.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <h1 className="text-2xl font-mono font-bold text-foreground tracking-tight">
                france_map.interactive
              </h1>
            </a>
            <p className="text-sm font-mono text-muted-foreground">
              click france → explore regions → departments
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="w-full h-[800px] rounded-lg border border-border bg-card overflow-hidden">
          <FranceMap />
        </div>
      </div>
    </main>
  )
}

