import { getWine } from '@/lib/actions/wines';
import { getCampaigns } from '@/lib/actions/campaigns';
import WineForm from '@/components/admin/wine-form';
import { notFound } from 'next/navigation';

interface EditWinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWinePage({ params }: EditWinePageProps) {
  try {
    const { id } = await params;
    const [wine, campaigns] = await Promise.all([
      getWine(id),
      getCampaigns(),
    ]);
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Wine</h1>
          <p className="text-gray-600">Update wine information</p>
        </div>

        <WineForm 
          wine={wine} 
          campaigns={campaigns}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
