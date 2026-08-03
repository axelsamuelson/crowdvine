import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Köpvillkor | PACT",
  description: "Köpvillkor för PACT — avtalspart EURPACT OÜ.",
};

export default function VilkorPage() {
  return (
    <main className="mx-auto min-h-[60vh] max-w-2xl px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
        Köpvillkor
      </h1>
      <p className="text-base leading-relaxed text-muted-foreground">
        Avtalspart för köp på PACT är EURPACT OÜ, registreringsnummer 17538270,
        Estland. Frågor hanteras via noreply@pactwines.com.
      </p>
      <p className="mt-8">
        <Link
          href="/"
          className="text-sm text-foreground underline underline-offset-4"
        >
          Tillbaka till startsidan
        </Link>
      </p>
    </main>
  );
}
