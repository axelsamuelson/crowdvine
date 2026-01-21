import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ProducerSettingsEditor } from "@/components/producer/producer-settings-editor";

export default async function ProducerSettingsPage() {
  await requireAuth("producer");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/producer">
            <Button variant="outline" className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <ProducerSettingsEditor />
      </div>
    </main>
  );
}

