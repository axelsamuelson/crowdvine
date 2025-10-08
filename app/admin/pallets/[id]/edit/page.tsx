import { getPallet } from "@/lib/actions/pallets";
import PalletForm from "@/components/admin/pallet-form";
import { notFound } from "next/navigation";

interface EditPalletPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPalletPage({ params }: EditPalletPageProps) {
  const resolvedParams = await params;
  const pallet = await getPallet(resolvedParams.id);

  if (!pallet) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <PalletForm pallet={pallet} />
    </div>
  );
}

