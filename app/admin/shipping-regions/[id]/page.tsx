import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import ShippingRegionForm from "@/components/admin/shipping-region-form";
import { Button } from "@/components/ui/button";
import { Globe2 } from "lucide-react";

interface EditShippingRegionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditShippingRegionPage({
  params,
}: EditShippingRegionPageProps) {
  const { id } = await params;
  const sb = getSupabaseAdmin();

  const { data: region, error } = await sb
    .from("shipping_regions")
    .select("id, name, country_code, description")
    .eq("id", id)
    .maybeSingle();

  if (error || !region) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <Globe2 className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit shipping region
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {region.name}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700"
        >
          <Link href="/admin/shipping-regions">Back to list</Link>
        </Button>
      </div>

      <ShippingRegionForm
        region={{
          id: region.id,
          name: region.name,
          country_code: region.country_code,
          description: region.description,
        }}
      />
    </div>
  );
}
