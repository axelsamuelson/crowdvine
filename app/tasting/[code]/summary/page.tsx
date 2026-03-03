"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { HeroSection } from "@/components/invite-landing/sections/hero-section";
import { ManifestoSection } from "@/components/invite-landing/sections/manifesto-section";
import { TastingWinesSection } from "@/components/tasting-summary/tasting-wines-section";
import { OtherInStockSection } from "@/components/tasting-summary/other-in-stock-section";
import { OutOfStockSection } from "@/components/tasting-summary/out-of-stock-section";
import { LenisProvider } from "@/components/invite-landing/lenis-provider";
import { CustomCursor } from "@/components/invite-landing/custom-cursor";

interface Summary {
  session: { id: string; name: string };
  statistics: { totalWines: number };
  wines: Array<{
    wine: {
      id: string;
      wine_name: string;
      vintage: string;
      grape_varieties?: string | null;
      color?: string | null;
      label_image_path?: string | null;
      producer_name?: string | null;
    };
    averageRating: number | null;
  }>;
}

/**
 * Sammanfattningssida som ser exakt ut som business-inbjudan (dirtywine.se/b/...)
 * men visar bara de viner som ingick i vinprovningen.
 */
export default function TastingSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    fetch(`/api/wine-tastings/by-code/${code}/join`, { method: "POST" })
      .then((res) => {
        if (!res.ok) {
          res.json().then((d) => toast.error(d.error || "Session not found")).catch(() => toast.error("Session not found"));
          router.push("/");
          return null;
        }
        return res.json();
      })
      .then((joinData) => {
        if (!joinData?.participant?.session_id) return;
        return fetch(`/api/wine-tastings/${joinData.participant.session_id}/summary`).then((r) =>
          r.ok ? r.json() : null,
        );
      })
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch(() => toast.error("Kunde inte ladda sammanfattning"))
      .finally(() => setLoading(false));
  }, [code, router]);

  if (loading) {
    return (
      <div className="invite-opus-page bg-background min-h-screen flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const wines = summary?.wines ?? [];
  const tastingWineIds = wines.map((w) => w.wine.id);

  return (
    <div className="invite-opus-page custom-cursor bg-background min-h-screen">
      <CustomCursor />
      <LenisProvider>
        <main className="bg-background">
          <HeroSection showDirtyWineLogo compact />
          <ManifestoSection
            isBusinessOnly
            customText="Thank you for trying our wines. Here is the list of wines that you tried during the wine tasting. :)"
          />
          <TastingWinesSection wines={wines} loading={false} />
          <ManifestoSection
            isBusinessOnly
            customText="Wine we have in stock but was not included in the winetasting."
            compact
          />
          <OtherInStockSection tastingWineIds={tastingWineIds} />
          <ManifestoSection
            isBusinessOnly
            customText="Wine we dont have in stock currently."
            compact
          />
          <OutOfStockSection />
        </main>
      </LenisProvider>
    </div>
  );
}
