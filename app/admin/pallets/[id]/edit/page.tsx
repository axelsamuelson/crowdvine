import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPallet } from "@/lib/actions/pallets";
import PalletForm from "@/components/admin/pallet-form";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";

interface EditPalletPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPalletPage({ params }: EditPalletPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const pallet = await getPallet(id);

  if (!pallet) {
    notFound();
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="space-y-1">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-2 px-2 text-sm font-normal text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <Link href={`/admin/pallets/${id}`}>
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to Pallet
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Edit Pallet
        </h1>
        <p className="text-sm text-zinc-500">
          Update pallet configuration and routing
        </p>
      </header>
      <PalletForm pallet={pallet} />
    </div>
  );
}
