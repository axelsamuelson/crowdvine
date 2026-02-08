import B2BPalletForm from "@/components/admin/b2b-pallet-form";

export default async function B2BEditPalletPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <B2BPalletForm shipmentId={id} />;
}
