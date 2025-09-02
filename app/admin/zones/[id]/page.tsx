import { getPalletZone } from '@/lib/actions/zones';
import ZoneForm from '@/components/admin/zone-form';
import { DeleteZoneButton } from '@/components/admin/delete-zone-button';
import { notFound } from 'next/navigation';

interface EditZonePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditZonePage({ params }: EditZonePageProps) {
  try {
    const { id } = await params;
    const zone = await getPalletZone(id);
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Zone</h1>
            <p className="text-gray-600">Update zone configuration</p>
          </div>
          <DeleteZoneButton zoneId={zone.id} zoneName={zone.name} />
        </div>

        <ZoneForm zone={zone} />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
