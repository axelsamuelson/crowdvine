import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Concept5Page() {
  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-4">Placeholder</Badge>
              <h1 className="text-4xl font-light mb-2">Concept 5: Zoom Into the Supply Chain</h1>
              <p className="text-muted-foreground italic">
                Transparent logistikskiss
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
                En tech-skiss som visar hela resan: Producent → Pall → Transport → Sverige. Varje steg är en interaktiv nod med tooltip.
              </p>
              <p className="text-muted-foreground">
                Du ser exakt hur teknik och community ersätter mellanhänder. Ger en känsla av: "This isn't e-commerce, this is infrastructure."
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

