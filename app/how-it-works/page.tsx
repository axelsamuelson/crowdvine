import type { Metadata } from "next";
import Link from "next/link";
import { EngagementTrackers } from "@/components/analytics/engagement-trackers";
import {
  defaultOpenGraphImages,
  pageTwitterCard,
} from "@/lib/seo/default-social";
import { getSiteConfig } from "@/lib/site-config";

const TITLE = "Så fungerar det";
const DESCRIPTION =
  "Hur PACT fungerar — från reservation till leverans. Du betalar när pallen är full.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const url = `${config.baseUrl}/how-it-works`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: url,
      languages: {
        sv: url,
        "x-default": url,
      },
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url,
      type: "website",
      locale: "sv_SE",
      images: defaultOpenGraphImages(),
    },
    twitter: pageTwitterCard(TITLE, DESCRIPTION),
  };
}

export default function HowItWorksPage() {
  return (
    <main className="mx-auto min-h-[80vh] max-w-2xl px-4 py-16">
      <EngagementTrackers />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
        Så fungerar det
      </h1>
      <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
        <p>
          Du reserverar flaskor online. När tillräckligt många beställt fylls
          en pall hos producenten och skickas direkt till dig.
        </p>
        <p>
          Du betalar när pallen är full — vi debiterar kortet du sparade i
          kassan.
        </p>
      </div>
      <p className="mt-8">
        <Link
          href="/vin"
          className="text-sm text-foreground underline underline-offset-4"
        >
          Utforska viner
        </Link>
      </p>
    </main>
  );
}
