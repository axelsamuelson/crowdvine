import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPallet } from "@/lib/actions/pallets";
import AdminPalletDetails from "@/components/admin/admin-pallet-details";
import { Card, CardContent } from "@/components/ui/card";

interface AdminPalletPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPalletPage({ params }: AdminPalletPageProps) {
  const resolvedParams = await params;
  const pallet = await getPallet(resolvedParams.id);

  if (!pallet) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense fallback={
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      }>
        <AdminPalletDetails pallet={pallet} palletId={resolvedParams.id} />
      </Suspense>
    </div>
  );
}
