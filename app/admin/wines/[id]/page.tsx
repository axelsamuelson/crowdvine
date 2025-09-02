import { getWine } from '@/lib/actions/wines';
import { getProducers } from '@/lib/actions/producers';
import WineForm from '@/components/admin/wine-form';
import { DeleteWineButton } from '@/components/admin/delete-wine-button';
import { notFound } from 'next/navigation';

interface EditWinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWinePage({ params }: EditWinePageProps) {
  try {
    const { id } = await params;
    const [wine, producers] = await Promise.all([
      getWine(id),
      getProducers(),
    ]);
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Wine</h1>
            <p className="text-gray-600">Update wine information</p>
          </div>
          <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
        </div>

        <WineForm 
          wine={wine} 
          producers={producers}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
