import { getProducer, updateProducer } from '@/lib/actions/producers';
import ProducerForm from '@/components/admin/producer-form';
import { notFound } from 'next/navigation';

interface EditProducerPageProps {
  params: { id: string };
}

export default async function EditProducerPage({ params }: EditProducerPageProps) {
  try {
    const producer = await getProducer(params.id);
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Producer</h1>
          <p className="text-gray-600">Update producer information</p>
        </div>

        <ProducerForm 
          producer={producer} 
          onSubmit={(data) => updateProducer(params.id, data)} 
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
