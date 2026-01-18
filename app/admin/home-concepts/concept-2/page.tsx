import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Concept2Page() {
  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-4">Placeholder</Badge>
              <h1 className="text-4xl font-light mb-2">Concept 2: Crowdsourced Wine, Visualised</h1>
              <p className="text-muted-foreground italic">
                Tre pallar live i realtid
              </p>
            </div>
            <Link
              href="/admin/home-concepts"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Tillbaka
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Konceptbeskrivning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Tre rader längst upp, t.ex.: Languedoc "Early November Pall" — 64% full, Roussillon "Community Pick" — 27% full, Mixed Pallet #1 — 89% full.
              </p>
              <p className="text-muted-foreground">
                Klick → öppnar network-diagram för just den pallen. Visuellt: varje pall är en cirkel; producenterna drar trådar in i den som visar hur mycket de bidrar med.
              </p>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium">Status: Kommer att utvecklas efter Concept 1</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

