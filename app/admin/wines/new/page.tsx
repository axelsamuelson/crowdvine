import { getProducers } from "@/lib/actions/producers";
import WineForm from "@/components/admin/wine-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewWinePage() {
  const producers = await getProducers();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
        <div className="space-y-4">
          <Link href="/admin/wines">
            <Button variant="outline" className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to wines
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Add Wine</h1>
            <p className="text-gray-500">Create a new wine product</p>
          </div>
        </div>

        <WineForm producers={producers} />
      </div>
    </main>
  );
}
