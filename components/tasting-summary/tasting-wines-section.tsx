"use client";

import { useState, useMemo } from "react";
import { SummaryWineCard } from "./summary-wine-card";
import { TastingWineModal, type TastingWineModalData } from "./tasting-wine-modal";
import { Loader2 } from "lucide-react";

function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.trim().replace(/\n/g, "");
  if (clean.startsWith("http")) return clean;
  if (clean.startsWith("/uploads/"))
    return `/api/images/${clean.replace("/uploads/", "")}`;
  return `/api/images/${clean}`;
}

function priceExclVatFromWine(wine: {
  base_price_cents?: number | null;
  price_includes_vat?: boolean | null;
  b2b_price_excl_vat?: number | null;
}): number | null {
  if (wine.b2b_price_excl_vat != null) return wine.b2b_price_excl_vat;
  const cents = wine.base_price_cents;
  if (cents == null) return null;
  const inclVat = wine.price_includes_vat !== false;
  const sek = cents / 100;
  return inclVat ? sek / 1.25 : sek;
}

export interface TastingWine {
  wine: TastingWineModalData;
  averageRating: number | null;
}

/**
 * Same layout as InviteWinesSection on /b/[code] but only shows wines from the tasting.
 * Cards show price exkl. moms; click opens modal with wine info.
 */
export function TastingWinesSection({
  wines,
  loading,
}: {
  wines: TastingWine[];
  loading: boolean;
}) {
  const [selectedWine, setSelectedWine] = useState<TastingWine | null>(null);

  const selectedPriceExclVat = useMemo(
    () => (selectedWine ? priceExclVatFromWine(selectedWine.wine) : null),
    [selectedWine],
  );

  if (loading) {
    return (
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto flex justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (wines.length === 0) {
    return (
      <section className="py-16 px-6">
        <div className="max-w-md mx-auto text-center">
          <p className="text-muted-foreground mb-6">
            Inga viner i denna provning.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-6 pb-16 md:pt-8 md:pb-16 px-3 md:px-6 w-full">
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
          {wines.map((item) => {
            const priceExclVat = priceExclVatFromWine(item.wine);
            return (
              <SummaryWineCard
                key={item.wine.id}
                wine={item.wine}
                priceExclVat={priceExclVat}
                getImageUrl={getImageUrl}
                onWineClick={() => setSelectedWine(item)}
              />
            );
          })}
        </div>
      </div>

      <TastingWineModal
        wine={selectedWine?.wine ?? null}
        priceExclVat={selectedPriceExclVat}
        onClose={() => setSelectedWine(null)}
      />
    </section>
  );
}
