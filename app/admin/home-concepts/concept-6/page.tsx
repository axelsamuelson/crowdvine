import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Concept6Page() {
  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-4">Placeholder</Badge>
              <h1 className="text-4xl font-light mb-2">Concept 6: Wine Galaxy</h1>
              <p className="text-muted-foreground italic">
                Ett universum av producenter (Three.js)
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
                Tänk en stjärnhimmel: Varje vinmakare är en stjärna. Stjärnorna grupperar sig kring pallar.
              </p>
              <p className="text-muted-foreground">
                Du kan "flyga igenom" galaktiska clustret av naturvin. Klicka på en stjärna → öppna producentens sida. Det känns stort, vackert, framtidsorienterat, men ändå enkelt: bara peka/klicka.
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

