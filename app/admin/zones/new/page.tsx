import ZoneForm from '@/components/admin/zone-form';

export default function NewZonePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add Zone</h1>
        <p className="text-gray-600">Create a new delivery zone</p>
      </div>

      <ZoneForm />
    </div>
  );
}
