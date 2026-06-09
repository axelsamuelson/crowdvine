import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Footer } from "@/components/layout/footer";
import {
  extractWineText,
  type WineLocale,
} from "@/lib/i18n/wine-locale";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}/languedoc/naturvin`;
  return {
    title: "Naturvin från Languedoc — köp direkt från producenten",
    description:
      "Languedoc är hjärtat i den franska naturvinsrörelsen. Köp naturvin direkt från små producenter i Saint-Chinian och Faugères. Hemleverans i Stockholm.",
    alternates: {
      canonical: pageUrl,
      languages: {
        sv: "https://pactwines.com/languedoc/naturvin",
        en: "https://pactwines.com/languedoc/naturvin",
        "x-default": "https://pactwines.com/languedoc/naturvin",
      },
    },
    openGraph: {
      title: "Naturvin från Languedoc — köp direkt från producenten",
      description:
        "Languedoc är hjärtat i den franska naturvinsrörelsen. Köp naturvin direkt från små producenter i Saint-Chinian och Faugères.",
      url: pageUrl,
      type: "article",
    },
  };
}

type ProducerListRow = {
  id: string;
  name: string;
  region: string | null;
  subregion: string | null;
  certification: string | null;
  short_description: Record<string, string> | string | null;
};

function producerInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function LanguedocNaturvinPage() {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("pact_locale")?.value ?? "sv";
  const locale: WineLocale = rawLocale === "en" ? "en" : "sv";

  const sb = getSupabaseAdmin();
  const { data: producersRaw } = await sb
    .from("producers")
    .select("id, name, region, subregion, certification, short_description")
    .order("name");

  const producers = ((producersRaw ?? []) as ProducerListRow[]).slice(0, 6);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Shop",
        item: "https://pactwines.com/vin",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Languedoc",
        item: "https://pactwines.com/languedoc",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Naturvin",
        item: "https://pactwines.com/languedoc/naturvin",
      },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Naturvin från Languedoc — köp direkt från producenten",
    description:
      "Guide till naturvin från Languedoc — producenter, stilar och direktimport till Stockholm.",
    publisher: {
      "@type": "Organization",
      name: "PACT",
      url: "https://pactwines.com",
      sameAs: ["https://www.instagram.com/pactwines"],
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Vad är naturvin från Languedoc?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Naturvin från Languedoc görs av småproducenter i södra Frankrike med ekologisk eller biodynamisk odling, indigena jästsvampar och utan tillsatser.",
        },
      },
      {
        "@type": "Question",
        name: "Vilka druvor används i Languedoc?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "De vanligaste druvorna i Languedoc är Carignan, Grenache, Syrah, Cinsault och Mourvèdre för röda viner, samt Vermentino, Chardonnay och Terret för vita viner.",
        },
      },
      {
        "@type": "Question",
        name: "Hur köper jag naturvin från Languedoc?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Via PACT kan du beställa naturvin direktimporterat från Languedoc med hemleverans i Stockholm. Beställ online på pactwines.com.",
        },
      },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/vin">Shop</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/languedoc">Languedoc</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Naturvin</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
          Naturvin från Languedoc — köp direkt från producenten
        </h1>

        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Languedoc är hjärtat i den franska naturvinsrörelsen. Här odlar
          hundratals små producenter utan tillsatser, med spontanjäsning och
          minimal intervention — ofta ekologiskt eller biodynamiskt. PACT
          importerar direkt från vingårdar i Saint-Chinian, Faugères och
          grannappellationer, utan distributörer eller lager i mellanhänder.
          Du får samma vin som serveras på bistroer i Paris och Montpellier —
          hem till Stockholm via Budbee.
        </p>

        <section className="space-y-4">
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Vad är naturvin från Languedoc?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Naturvin i Languedoc handlar om ärligt jordbruk och tydlig
            ursprung. Druvor skördas för hand eller selektivt, jäser med
            vildjäst och buteljeras ofta utan klarificering eller filtrering.
            Resultatet kan variera från friska, lättdruckna röda till
            strukturerade viner med skiffer-mineralitet från Faugères — alltid
            med producentens avtryck i glaset.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Saint-Chinian och Faugères
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Saint-Chinian erbjuder röda viner med balans mellan mörk frukt och
            frisk syra, ofta från grenache och syrah på kalk och lera.
            Faugères, med sitt skifferunderlag, ger mer mineraliska och
            koncentrerade viner — idealiska för dem som söker terroir framför
            volym. Många av våra producenter arbetar i båda appellationerna och
            experimenterar med olika macerationstider och äldringsmetoder.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Köp direkt via PACT
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vi samlar beställningar till gemensamma pallar från södra
            Frankrike. När en pall fylls skickas vinet direkt till Stockholm —
            utan Systembolagets sortimentslager och utan onödiga påslag. Du ser
            vem som gör vinet, var det odlas och vad det kostar. Ofta 15–30 %
            under jämförbara priser i Sverige.
          </p>
        </section>

        <section>
          <h2 className="mt-12 mb-4 border-b border-border pb-3 text-xl font-semibold">
            Producenter från Languedoc
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {producers.map((producer) => {
              const slug = generateProducerSlug(producer.name);
              const bio = extractWineText(producer.short_description, locale);
              const initials = producerInitials(producer.name);

              return (
                <Link
                  key={producer.id}
                  href={`/producer/${slug}`}
                  className="group overflow-hidden rounded-xl border bg-white transition-colors hover:border-zinc-400"
                >
                  <div className="flex h-20 items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                    <span className="text-xl font-bold text-white opacity-30">
                      {initials}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold group-hover:underline">
                      {producer.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {producer.region}
                      {producer.subregion ? ` · ${producer.subregion}` : ""}
                    </p>
                    {bio ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {bio}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
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
              href="/vin"
              className="rounded-full bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
            >
              Se alla viner
            </Link>
            <Link
              href="/producers"
              className="rounded-full border border-background/30 px-6 py-2.5 text-sm font-medium text-background transition-colors hover:border-background/60"
            >
              Möt producenterna
            </Link>
            <Link
              href="/vin/naturvin-languedoc"
              className="rounded-full border border-background/30 px-6 py-2.5 text-sm font-medium text-background transition-colors hover:border-background/60"
            >
              Se naturvin från Languedoc i butiken →
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
