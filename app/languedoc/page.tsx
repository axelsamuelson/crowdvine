import type { Metadata } from "next";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Footer } from "@/components/layout/footer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Languedoc — Frankrikes mest spännande vinregion",
    description:
      "Languedoc är Frankrikes största vinregion med 240 000 hektar vingårdar. Lär dig om appellationer, druvor, klimat och varför regionen producerar några av Frankrikes bästa naturviner.",
    alternates: {
      canonical: "https://pactwines.com/languedoc",
    },
    openGraph: {
      title: "Languedoc — Frankrikes mest spännande vinregion | PACT",
      description:
        "Languedoc är Frankrikes största vinregion. Lär dig om appellationer, druvor, klimat och naturvin.",
      url: "https://pactwines.com/languedoc",
      type: "article",
    },
  };
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border border-l-[3px] border-l-amber-500 bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

export default function LanguedocPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Shop",
        item: "https://pactwines.com/shop",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Languedoc",
        item: "https://pactwines.com/languedoc",
      },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Languedoc — Frankrikes mest spännande vinregion",
    description:
      "Guide till Languedoc som vinregion — appellationer, terroir, druvor och naturvin.",
    publisher: {
      "@type": "Organization",
      name: "PACT",
      url: "https://pactwines.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/shop">Shop</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Languedoc</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          Languedoc — Frankrikes mest spännande vinregion
        </h1>

        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Languedoc-Roussillon sträcker sig längs Medelhavskusten från
          Rhônedeltat till den spanska gränsen. Med runt 240 000 hektar
          vingårdar är det Frankrikes största vinregion — och en av Europas
          mest dynamiska när det gäller ekologiskt odlat och naturligt vin.
          Här möts sol, vind och gamla stenjordar som ger viner med tydlig
          karaktär till ett pris som ofta slår klassiska regioner.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          <SpecCell label="Yta" value="~240 000 ha vingård" />
          <SpecCell label="Land" value="Frankrike" />
          <SpecCell label="Klimat" value="Medelhavsklimat" />
          <SpecCell label="Huvuddruvor" value="Grenache, Syrah, Carignan" />
          <SpecCell label="Appellationer" value="Saint-Chinian, Faugères m.fl." />
          <SpecCell label="Stil" value="Naturvin, ekologiskt, terroir" />
        </div>

        <section className="space-y-4">
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Var ligger Languedoc?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Regionen omfattar departementen längs södra Frankrikes kust —
            från Aude och Hérault till Gard och Pyrénées-Orientales. Inland
            dominerar låga kullar, garrigue och kalksten. Närheten till
            Medelhavet ger varma somrar och milda vintrar, medaljerade av
            norra vindar som tramontane och mistral som håller vingårdarna
            friska och minskar risken för sjukdomar.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Appellationer att känna till
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Languedoc har både breda IGP-etiketter och mer strikta AOP:er.
            Saint-Chinian och Faugères i norr är kända för strukturerade röda
            från schist och kalksten. Minervois, Corbières och Fitou erbjuder
            allt från rustika carignan-dominanta viner till eleganta
            grenache-syrah-blandningar. Pic Saint-Loup och La Clape vid kusten
            ger mineraliska vita och friska roséer. För naturvin-entusiaster
            är just dessa mindre, producentdrivna appellationer ofta mest
            intressanta.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Druvor och stilar
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Röda viner dominerar, med grenache, syrah, carignan och mourvèdre
            som ryggraden. Carignan från gamla stockar ger djup och syra;
            grenache bidrar med röd frukt och alkohol; syrah tillför krydda
            och struktur. Vita viner byggs ofta på grenache blanc, roussanne,
            marsanne och vermentino. Orangevin och macererade vita har stark
            förankring här — särskilt bland oberoende producenter som experimenterar
            med skinkontakt och spontanjäsning.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Terroir och klimat
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Jordmån varierar kraftigt: skiffer (schist) i Faugères och
            Saint-Chinian, kalksten i Minervois, grus nära kusten och
            vulkaniska inslag runt Pic Saint-Loup. Det ger vinerna tydlig
            platskaraktär trots regionens storlek. Det varma klimatet kräver
            skickliga vinbönder — låga utbildningar, bush vines och skörd
            tidigt på morgonen är vanliga strategier för att bevara friskhet
            i ett landskap där solen är generös.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Naturvin i Languedoc
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Languedoc har blivit ett nav för Frankrikes naturvinsrörelse.
            Låga skördar, ekologisk odling utan kemiska bekämpningsmedel,
            spontanjäsning och minimal filtrering är standard hos många små
            producenter vi arbetar med. Regionens tradition av kooperativ och
            bulkvin håller på att ersätas av hantverksproducenter som exporterar
            direkt — precis den modell PACT bygger på: från vingård till
            Stockholm utan onödiga mellanhänder.
          </p>
        </section>

        <div className="mt-16 rounded-xl bg-foreground p-8 text-center text-background">
          <h2 className="mb-2 text-xl font-semibold">
            Utforska naturvin från Languedoc
          </h2>
          <p className="mb-6 text-sm opacity-70">
            Direktimporterat från producenter i Saint-Chinian och Faugères
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/languedoc/naturvin"
              className="rounded-full bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
            >
              Naturvin från Languedoc
            </Link>
            <Link
              href="/shop"
              className="rounded-full border border-background/30 px-6 py-2.5 text-sm font-medium text-background transition-colors hover:border-background/60"
            >
              Se alla viner
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
