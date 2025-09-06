import ProducerForm from "@/components/admin/producer-form";

export default function NewProducerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add Producer</h1>
        <p className="text-gray-600">Create a new wine producer</p>
      </div>

      <ProducerForm />
    </div>
  );
}
