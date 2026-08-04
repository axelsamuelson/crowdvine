import { getWine } from "@/lib/actions/wines";
import { getProducers } from "@/lib/actions/producers";
import { getWineInternalRatings } from "@/lib/actions/wine-ratings";
import WineForm from "@/components/admin/wine-form";
import { WineInternalRatingCard } from "@/components/admin/wine-internal-rating-card";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Wine } from "lucide-react";
import { ADMIN_OUTLINE_BUTTON_CLASS, ADMIN_PRIMARY_BUTTON_CLASS } from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";

interface EditWinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWinePage({ params }: EditWinePageProps) {
  try {
    const { id } = await params;
    const [wine, producers, ratings] = await Promise.all([
      getWine(id),
      getProducers(),
      getWineInternalRatings(id),
    ]);

    return (
      <div className="space-y-6">
        <Link href="/admin/wines">
          <Button
            variant="outline"
            size="sm"
            className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium")}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Tillbaka till viner
          </Button>
        </Link>

        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0F0F12]/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
              <Wine className="h-5 w-5 text-gray-900 dark:text-zinc-50" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {wine.wine_name} {wine.vintage}
              </h1>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                Redigera vin — fälten motsvarar produktsidan (PDP)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {wine.handle ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium")}
              >
                <Link href={`/product/${wine.handle}`} target="_blank">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Visa PDP
                </Link>
              </Button>
            ) : null}
            <Button
              form="wine-edit-form"
              type="submit"
              size="sm"
              className={cn(ADMIN_PRIMARY_BUTTON_CLASS, "text-xs font-medium")}
            >
              Spara vin
            </Button>
            <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
          </div>
        </div>

        <WineForm
          wine={wine}
          producers={producers}
          afterProductDropdowns={
            <WineInternalRatingCard
              key="wine-internal-ratings"
              wineId={id}
              ratings={ratings}
            />
          }
        />
      </div>
    );
  } catch {
    notFound();
  }
}
