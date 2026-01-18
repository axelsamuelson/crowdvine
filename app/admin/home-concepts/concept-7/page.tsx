import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Concept7Page() {
  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-4">Placeholder</Badge>
              <h1 className="text-4xl font-light mb-2">Concept 7: One Pall, Hundreds of Hands</h1>
              <p className="text-muted-foreground italic">
                En social visualisering
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
                En huvudsektion som visar: Antalet aktiva användare (live), hur många flaskor som reserveras just nu, en visualisering av senaste interaktionerna (som GitHub "contributions graph" fast för flaskor).
              </p>
              <p className="text-muted-foreground">
                Exempel: "Kim från Stockholm reserverade 3 flaskor från Le Bouc à Trois Pattes", "Lisa fyllde precis 3% av Languedoc-pallen". Mycket engagerande utan att bli rörigt.
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

