import { getProducers } from "@/lib/actions/producers";
import WineForm from "@/components/admin/wine-form";
import { Wine } from "lucide-react";

interface NewWinePageProps {
  searchParams: Promise<{ producer_id?: string }>;
}

export default async function NewWinePage({ searchParams }: NewWinePageProps) {
  const producers = await getProducers();
  const params = await searchParams;
  const initialProducerId =
    params.producer_id && params.producer_id.trim()
      ? params.producer_id.trim()
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2 dark:bg-zinc-800">
          <Wine className="h-5 w-5 text-gray-900 dark:text-zinc-50" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lägg till vin
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Skapa ett nytt vin — fälten motsvarar produktsidan (PDP)
          </p>
        </div>
      </div>

      <WineForm producers={producers} initialProducerId={initialProducerId} />
    </div>
  );
}
