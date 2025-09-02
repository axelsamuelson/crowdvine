import { getPallet } from '@/lib/actions/pallets';
import PalletForm from '@/components/admin/pallet-form';
import { notFound } from 'next/navigation';

interface EditPalletPageProps {
  params: { id: string };
}

export default async function EditPalletPage({ params }: EditPalletPageProps) {
  const pallet = await getPallet(params.id);
  
  if (!pallet) {
    notFound();
  }

  return <PalletForm pallet={pallet} />;
}
