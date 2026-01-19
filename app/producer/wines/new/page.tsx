import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import WineForm from "@/components/admin/wine-form";
import type { Producer } from "@/lib/actions/producers";
import { Button } from "@/components/ui/button";

export default async function ProducerNewWinePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/access-request");
  if (user.role !== "producer" && user.role !== "admin") redirect("/");
  if (!user.producer_id) redirect("/producer");

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
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/producer/wines">
          <Button variant="outline">Back</Button>
        </Link>
      </div>
      <WineForm producers={producers} />
    </div>
  );
}


