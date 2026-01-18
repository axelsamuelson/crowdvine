import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const concepts = [
  {
    id: 1,
    title: "The Living Pallet",
    subtitle: "Interaktiv Nervsystemskarta",
    description: "En stor fullskärmsvisualisering visar en pall i mitten med producentnoder spridda runt som ett nervsystem. Linjer = reserverade flaskor.",
    status: "in-development",
    route: "/concept-1",
  },
  {
    id: 2,
    title: "Crowdsourced Wine, Visualised",
    subtitle: "Tre pallar live i realtid",
    description: "Tre rader längst upp visar pallar med progress. Klick → öppnar network-diagram för just den pallen.",
    status: "placeholder",
    route: "/concept-2",
  },
  {
    id: 3,
    title: "Map of Makers",
    subtitle: "En techifierad vinregionkarta",
    description: "En stiliserad karta över Languedoc/Roussillon/Frankrike med noder = producenter. Varje nod pulserar med färg som indikerar reservat.",
    status: "placeholder",
    route: "/concept-3",
  },
  {
    id: 4,
    title: "Your Bottle Shapes the Network",
    subtitle: "Personlig onboarding på startsidan",
    description: "Startsidan förklarar visuellt: Du reserverar flaskor → skapar tråd till pall → fler reserverar → tråden tjocknar → pallen fylls.",
    status: "placeholder",
    route: "/concept-4",
  },
  {
    id: 5,
    title: "Zoom Into the Supply Chain",
    subtitle: "Transparent logistikskiss",
    description: "En tech-skiss som visar hela resan: Producent → Pall → Transport → Sverige. Varje steg är en interaktiv nod med tooltip.",
    status: "placeholder",
    route: "/concept-5",
  },
  {
    id: 6,
    title: "Wine Galaxy",
    subtitle: "Ett universum av producenter (Three.js)",
    description: "Tänk en stjärnhimmel: Varje vinmakare är en stjärna. Stjärnorna grupperar sig kring pallar. Du kan 'flyga igenom' galaktiska clustret.",
    status: "placeholder",
    route: "/concept-6",
  },
  {
    id: 7,
    title: "One Pall, Hundreds of Hands",
    subtitle: "En social visualisering",
    description: "Visar antalet aktiva användare (live), hur många flaskor som reserveras just nu, och senaste interaktionerna.",
    status: "placeholder",
    route: "/concept-7",
  },
  {
    id: 8,
    title: "Producer Pulse",
    subtitle: "En pulserande faktor-graf",
    description: "Varje producent-nod pulserar med antalet reserverade flaskor. Tempoväxling när fler reserverar. Trådar hoppar mellan producenter.",
    status: "placeholder",
    route: "/concept-8",
  },
  {
    id: 9,
    title: "Minimalist Tech x Wine",
    subtitle: "En ren hero med tre stora interaktiva knappar",
    description: "Stor headline + tre stora interaktiva zoner: Se pallar, Utforska producenter, Hur det funkar. På hover öppnas ett mini-diagram.",
    status: "placeholder",
    route: "/concept-9",
  },
  {
    id: 10,
    title: "Your First Pall",
    subtitle: "Personligt rekommenderad pall",
    description: "Startsidan börjar med två frågor om preferenser. Direkt visar vi en personlig pall med network-diagrammet zoomas in på den.",
    status: "placeholder",
    route: "/concept-10",
  },
  {
    id: 11,
    title: "Interactive Dashboard",
    subtitle: "Personlig dashboard med expanderbara boxar",
    description: "Welcome box med profilinfo och tre expanderbara boxar: Se Pallar (concept-2), Map (concept-3), och Wine Identity (concept-10).",
    status: "in-development",
    route: "/concept-11",
  },
  {
    id: 12,
    title: "Masonry Grid",
    subtitle: "A dynamic layout system with balanced distribution",
    description: "En masonry grid layout med 40 items med olika höjder och färger. Visar dynamisk layout med CSS Grid och auto-rows.",
    status: "in-development",
    route: "/concept-12",
  },
];

export default function HomeConceptsIndex() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-foreground mb-2">
          Home Page Concepts
        </h1>
        <p className="text-muted-foreground">
          Testa olika startsida-koncept. Bara admin kan se dessa sidor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {concepts.map((concept) => (
          <Link key={concept.id} href={concept.route}>
            <Card className="h-full hover:border-foreground/40 transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl font-light">
                    Concept {concept.id}
                  </CardTitle>
                  <Badge
                    variant={
                      concept.status === "in-development"
                        ? "default"
                        : "outline"
                    }
                  >
                    {concept.status === "in-development"
                      ? "In Development"
                      : "Placeholder"}
                  </Badge>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {concept.title}
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  {concept.subtitle}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {concept.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

