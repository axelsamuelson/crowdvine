import { getWine } from "@/lib/actions/wines";
import { getProducers } from "@/lib/actions/producers";
import { getWineInternalRatings } from "@/lib/actions/wine-ratings";
import { WineEditPageClient } from "@/components/admin/wine-edit-page-client";
import { WineInternalRatingCard } from "@/components/admin/wine-internal-rating-card";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "@/lib/admin-form-styles";
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

        <WineEditPageClient
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
