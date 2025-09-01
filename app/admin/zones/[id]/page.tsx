import { getPalletZone, updatePalletZone } from '@/lib/actions/zones';
import ZoneForm from '@/components/admin/zone-form';
import { notFound } from 'next/navigation';

interface EditZonePageProps {
  params: { id: string };
}

export default async function EditZonePage({ params }: EditZonePageProps) {
  try {
    const zone = await getPalletZone(params.id);
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Zone</h1>
          <p className="text-gray-600">Update zone configuration</p>
        </div>

        <ZoneForm 
          zone={zone} 
          onSubmit={(data) => updatePalletZone(params.id, data)} 
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
