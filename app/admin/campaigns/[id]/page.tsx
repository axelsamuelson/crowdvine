import { getCampaign, updateCampaign } from '@/lib/actions/campaigns';
import { getProducers } from '@/lib/actions/producers';
import CampaignForm from '@/components/admin/campaign-form';
import { notFound } from 'next/navigation';

interface EditCampaignPageProps {
  params: { id: string };
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  try {
    const [campaign, producers] = await Promise.all([
      getCampaign(params.id),
      getProducers(),
    ]);
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
          <p className="text-gray-600">Update campaign information</p>
        </div>

        <CampaignForm 
          campaign={campaign} 
          producers={producers}
          onSubmit={(data) => updateCampaign(params.id, data)} 
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
