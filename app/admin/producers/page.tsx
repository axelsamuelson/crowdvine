import Link from "next/link";
import { getProducers } from "@/lib/actions/producers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteProducerButton } from "@/components/admin/delete-producer-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export default async function ProducersPage() {
  const producers = await getProducers();
  const sb = getSupabaseAdmin();

  const pickupZoneIds = Array.from(
    new Set(
      producers
        .map((p: any) => p.pickup_zone_id)
        .filter((id: any) => typeof id === "string" && id.length > 0),
    ),
  ) as string[];

  const pickupZoneNameById = new Map<string, string>();
  if (pickupZoneIds.length > 0) {
    const { data: zones } = await sb
      .from("pallet_zones")
      .select("id, name")
      .in("id", pickupZoneIds);
    (zones || []).forEach((z: any) => pickupZoneNameById.set(z.id, z.name));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Producers</h1>
          <p className="text-gray-600">Manage wine producers</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/producer-groups">
            <Button variant="outline">Producer Groups</Button>
          </Link>
          <Link href="/admin/producers/new">
            <Button>Add Producer</Button>
          </Link>
        </div>
      </div>

      {producers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Producers</CardTitle>
            <CardDescription>Complete list of all producers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-600">Producer</TableHead>
                    <TableHead className="text-gray-600">Region</TableHead>
                    <TableHead className="hidden md:table-cell text-gray-600">
                      Country
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-gray-600">
                      Address
                    </TableHead>
                    <TableHead className="hidden xl:table-cell text-gray-600">
                      Pall
                    </TableHead>
                    <TableHead className="text-right text-gray-600">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {producers.map((producer) => (
                    <TableRow key={producer.id} className="hover:bg-gray-50">
                      <TableCell className="min-w-[240px]">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {producer.name}
                          </div>
                          {producer.short_description ? (
                            <div className="text-xs text-gray-500 truncate">
                              {producer.short_description}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {producer.region || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-700">
                        {producer.country_code || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-gray-700">
                        <div className="min-w-0">
                          <div className="truncate">
                            {producer.address_street || "—"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {producer.address_city || "—"}
                            {producer.address_postcode
                              ? `, ${producer.address_postcode}`
                              : ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-gray-700">
                        {producer.pickup_zone_id
                          ? pickupZoneNameById.get(producer.pickup_zone_id) ||
                            "—"
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/producers/${producer.id}`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <DeleteProducerButton
                            producerId={producer.id}
                            producerName={producer.name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {producers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No producers found</p>
            <Link href="/admin/producers/new">
              <Button>Add your first producer</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
