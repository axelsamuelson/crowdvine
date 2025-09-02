import { getProducers } from '@/lib/actions/producers';
import WineForm from '@/components/admin/wine-form';

export default async function NewWinePage() {
  const producers = await getProducers();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add Wine</h1>
        <p className="text-gray-600">Create a new wine product</p>
      </div>

      <WineForm producers={producers} />
    </div>
  );
}
