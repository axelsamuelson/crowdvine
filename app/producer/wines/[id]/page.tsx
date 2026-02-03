import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { getWine } from "@/lib/actions/wines";
import WineForm from "@/components/admin/wine-form";
import type { Producer } from "@/lib/actions/producers";
import { Button } from "@/components/ui/button";

export default async function ProducerEditWinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/access-request");
  if (user.role !== "producer" && user.role !== "admin") redirect("/");
  if (!user.producer_id) redirect("/producer");

  const { id } = await params;
  const wine = await getWine(id);

  // Prevent producers from editing wines that are not theirs
  if (user.role === "producer" && wine.producer_id !== user.producer_id) {
    redirect("/producer/wines");
  }

  const sb = await supabaseServer();
  const { data: producer } = await sb
    .from("producers")
    .select(
      "id, name, region, lat, lon, country_code, address_street, address_city, address_postcode, short_description, logo_image_path, pickup_zone_id",
    )
    .eq("id", user.producer_id)
    .single();

  const producers: Producer[] = producer ? [producer as Producer] : [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Edit Wine</h1>
            <p className="text-gray-500">
              Update details for <span className="text-gray-900">{wine.wine_name}</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/producer/wines">
              <Button variant="outline" className="rounded-full">
                Back
              </Button>
            </Link>
          </div>
        </div>

        <WineForm wine={wine} producers={producers} />
      </div>
    </main>
  );
}


