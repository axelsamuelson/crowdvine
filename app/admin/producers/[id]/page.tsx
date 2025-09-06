import { getProducer } from "@/lib/actions/producers";
import ProducerForm from "@/components/admin/producer-form";
import { DeleteProducerButton } from "@/components/admin/delete-producer-button";
import { notFound } from "next/navigation";

interface EditProducerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProducerPage({
  params,
}: EditProducerPageProps) {
  try {
    const { id } = await params;
    const producer = await getProducer(id);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Producer</h1>
            <p className="text-gray-600">Update producer information</p>
          </div>
          <DeleteProducerButton
            producerId={producer.id}
            producerName={producer.name}
          />
        </div>

        <ProducerForm producer={producer} />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
