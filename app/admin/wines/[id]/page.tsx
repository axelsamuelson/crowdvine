import { getWine } from "@/lib/actions/wines";
import { getProducers } from "@/lib/actions/producers";
import WineForm from "@/components/admin/wine-form";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/admin-page-shell";

interface EditWinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWinePage({ params }: EditWinePageProps) {
  try {
    const { id } = await params;
    const [wine, producers] = await Promise.all([getWine(id), getProducers()]);

    return (
      <AdminPageShell
        header={{
          title: `${wine.wine_name} ${wine.vintage}`,
          description: "Update bottle details and pricing.",
          breadcrumbs: [
            { label: "Catalog", href: "/admin/wines" },
            { label: wine.wine_name },
          ],
        }}
      >
        <div className="flex justify-end">
          <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
        </div>
        <WineForm wine={wine} producers={producers} />
      </AdminPageShell>
    );
  } catch (error) {
    notFound();
  }
}
