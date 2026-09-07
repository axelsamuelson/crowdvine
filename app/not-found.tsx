import type { Metadata } from "next";
import Link from "next/link";
import { PageLayoutServer } from "@/components/layout/page-layout-server";

export const metadata: Metadata = {
  title: "Sidan hittades inte",
  description: "Sidan du letade efter finns inte på PACT Wines.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <PageLayoutServer>
      <div className="min-h-[90vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-8xl font-bold text-primary/20 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Sidan hittades inte.{" "}
              <Link href="/" className="underline">
                Till startsidan
              </Link>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Vi kunde inte hitta sidan du letade efter. Den kan ha flyttats,
              tagits bort, eller så har du skrivit fel adress.
            </p>
          </div>
        </div>
      </div>
    </PageLayoutServer>
  );
}
