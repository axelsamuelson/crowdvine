import { getProducers } from '@/lib/actions/producers';
import CampaignForm from '@/components/admin/campaign-form';

export default async function NewCampaignPage() {
  const producers = await getProducers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Campaign</h1>
        <p className="text-gray-600">Create a new wine campaign</p>
      </div>

      <CampaignForm producers={producers} />
    </div>
  );
}
