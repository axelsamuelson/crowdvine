import { getCampaign } from '@/lib/actions/campaigns';
import { getProducers } from '@/lib/actions/producers';
import CampaignForm from '@/components/admin/campaign-form';
import { notFound } from 'next/navigation';

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  try {
    const { id } = await params;
    const [campaign, producers] = await Promise.all([
      getCampaign(id),
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
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
