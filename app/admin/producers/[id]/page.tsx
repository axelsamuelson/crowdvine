import Link from "next/link";
import Image from "next/image";
import { getProducer } from "@/lib/actions/producers";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import ProducerForm from "@/components/admin/producer-form";
import { DeleteProducerButton } from "@/components/admin/delete-producer-button";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EditProducerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProducerPage({
  params,
}: EditProducerPageProps) {
  try {
    const { id } = await params;
    const producer = await getProducer(id);
    const sb = getSupabaseAdmin();

    let winesResult = await sb
      .from("wines")
      .select("id, wine_name, vintage, handle, base_price_cents, is_live, label_image_path")
      .eq("producer_id", id)
      .order("wine_name", { ascending: true });

    if (winesResult.error && /is_live|column.*does not exist/i.test(winesResult.error.message ?? "")) {
      winesResult = await sb
        .from("wines")
        .select("id, wine_name, vintage, handle, base_price_cents, label_image_path")
        .eq("producer_id", id)
        .order("wine_name", { ascending: true });
    }

    const wines = (winesResult.data ?? []) as Array<{
      id: string;
      wine_name: string;
      vintage: string;
      handle: string;
      base_price_cents: number;
      is_live?: boolean;
      label_image_path?: string | null;
    }>;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Producer</h1>
            <p className="text-gray-600">Update producer information</p>
          </div>
          <DeleteProducerButton
            producerId={producer.id}
            producerName={producer.name}
          />
        </div>

        <ProducerForm producer={producer} />

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Viner</CardTitle>
                <CardDescription>
                  Alla viner som tillhör denna producent ({wines.length} st)
                </CardDescription>
              </div>
              <Link href={`/admin/wines/new?producer_id=${id}`}>
                <Button size="sm">Lägg till vin</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {wines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Inga viner kopplade till denna producent.{" "}
                <Link href={`/admin/wines/new?producer_id=${id}`} className="text-primary underline">
                  Lägg till vin
                </Link>
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-gray-600 w-20">Bild</TableHead>
                      <TableHead className="text-gray-600">Namn</TableHead>
                      <TableHead className="text-gray-600">Vintage</TableHead>
                      <TableHead className="text-gray-600">Handle</TableHead>
                      <TableHead className="text-gray-600">Pris</TableHead>
                      <TableHead className="text-gray-600">Status</TableHead>
                      <TableHead className="text-right text-gray-600">Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wines.map((wine) => (
                      <TableRow key={wine.id} className="hover:bg-gray-50">
                        <TableCell className="w-20 p-2">
                          <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={wine.label_image_path || DEFAULT_WINE_IMAGE_PATH}
                              alt={`${wine.wine_name} ${wine.vintage}`}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {wine.wine_name}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {wine.vintage || "—"}
                        </TableCell>
                        <TableCell className="text-gray-700 font-mono text-sm">
                          {wine.handle || "—"}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {wine.base_price_cents != null
                            ? `${(wine.base_price_cents / 100).toFixed(0)} kr`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {"is_live" in wine && wine.is_live === false ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                              Offline
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                              Live
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/wines/${wine.id}`}>
                            <Button variant="outline" size="sm">
                              Redigera
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
