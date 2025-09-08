import { notFound } from "next/navigation";
import { DeleteWineBoxButton } from "@/components/admin/delete-wine-box-button";
import WineBoxForm from "./components/wine-box-form";

interface EditWineBoxPageProps {
  params: Promise<{ id: string }>;
}

async function getWineBox(id: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/wine-boxes/${id}`, {
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error('Wine box not found');
  }
  
  return response.json();
}

async function getWineBoxItems(id: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/wine-boxes/${id}/items`, {
    cache: 'no-store'
  });
  
  if (!response.ok) {
    return [];
  }
  
  return response.json();
}

export default async function EditWineBoxPage({ params }: EditWineBoxPageProps) {
  try {
    const { id } = await params;
    const [wineBox, wineBoxItems] = await Promise.all([
      getWineBox(id),
      getWineBoxItems(id)
    ]);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Wine Box</h1>
            <p className="text-gray-600">Update wine box information</p>
          </div>
          <DeleteWineBoxButton wineBoxId={wineBox.id} wineBoxName={wineBox.name} />
        </div>

        <WineBoxForm wineBox={wineBox} wineBoxItems={wineBoxItems} />
      </div>
    );
  } catch (error) {
    notFound();
  }
}

