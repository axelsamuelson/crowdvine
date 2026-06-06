import { getWine } from "@/lib/actions/wines";
import { getProducers } from "@/lib/actions/producers";
import WineForm from "@/components/admin/wine-form";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Wine } from "lucide-react";

interface EditWinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWinePage({ params }: EditWinePageProps) {
  try {
    const { id } = await params;
    const [wine, producers] = await Promise.all([getWine(id), getProducers()]);

    return (
      <div className="space-y-6">
        <Link href="/admin/wines">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg border-gray-200 text-xs font-medium dark:border-zinc-700"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Tillbaka till viner
          </Button>
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
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
                className="rounded-lg border-gray-200 text-xs font-medium dark:border-zinc-700"
              >
                <Link href={`/product/${wine.handle}`} target="_blank">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Visa PDP
                </Link>
              </Button>
            ) : null}
            <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
          </div>
        </div>

        <WineForm wine={wine} producers={producers} />
      </div>
    );
  } catch {
    notFound();
  }
}
