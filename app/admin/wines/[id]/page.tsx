import { getWine } from "@/lib/actions/wines";
import { getProducers } from "@/lib/actions/producers";
import WineForm from "@/components/admin/wine-form";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface EditWinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWinePage({ params }: EditWinePageProps) {
  try {
    const { id } = await params;
    const [wine, producers] = await Promise.all([getWine(id), getProducers()]);

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6 pt-top-spacing space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <Link href="/admin/wines">
                <Button variant="outline" className="rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to wines
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-gray-900 mb-2">
                  Edit Wine
                </h1>
                <p className="text-gray-500">Update wine information</p>
              </div>
            </div>
            <div className="flex gap-2">
              <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
            </div>
          </div>

          <WineForm wine={wine} producers={producers} />
        </div>
      </main>
    );
  } catch (error) {
    notFound();
  }
}
