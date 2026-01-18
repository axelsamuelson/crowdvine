import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Concept9Page() {
  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-4">Placeholder</Badge>
              <h1 className="text-4xl font-light mb-2">Concept 9: Minimalist Tech x Wine</h1>
              <p className="text-muted-foreground italic">
                En ren hero med tre stora interaktiva knappar
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
                Om du vill ha maximal enkelhet: Hero med stor headline: "Beställ naturvin direkt från producenter — tillsammans."
              </p>
              <p className="text-muted-foreground">
                Under: Tre stora interaktiva zoner: Se pallar, Utforska producenter, Hur det funkar. På hover öppnas ett mini-diagram för varje. Perfekt för att undvika att det blir för "nördigt" direkt.
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

