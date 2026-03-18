import ProducerForm from "@/components/admin/producer-form";
import { Wine } from "lucide-react";

export default function NewProducerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
          <Wine className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Producer</h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400">Create a new wine producer</p>
        </div>
      </div>

      <ProducerForm />
    </div>
  );
}
