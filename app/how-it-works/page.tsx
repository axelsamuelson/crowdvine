import type { Metadata } from "next";
import Link from "next/link";
import { EngagementTrackers } from "@/components/analytics/engagement-trackers";

export const metadata: Metadata = {
  title: "Så fungerar det | PACT",
  description: "Hur PACT fungerar — från reservation till leverans.",
};

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
          Du betalar när pallen är full — vi skickar en betalningslänk till din
          e-post.
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
