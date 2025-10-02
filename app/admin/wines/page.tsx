import Link from "next/link";
import Image from "next/image";
import { getWines } from "@/lib/actions/wines";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import { Upload } from "lucide-react";

const colorColors = {
  red: "bg-red-100 text-red-800",
  white: "bg-yellow-100 text-yellow-800",
  rose: "bg-pink-100 text-pink-800",
};

export default async function WinesPage() {
  const wines = await getWines();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wines</h1>
          <p className="text-gray-600">Manage wine products</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/bulk-upload">
            <Button variant="outline" className="bg-gray-50 hover:bg-gray-100">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
          </Link>
          <Link href="/admin/wines/new">
            <Button>Add Wine</Button>
          </Link>
        </div>
      </div>

      {/* Wines Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Wines</CardTitle>
          <CardDescription>Complete list of all wine products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-medium text-sm text-gray-600">
                    Image
                  </th>
                  <th className="text-left p-3 font-medium text-sm text-gray-600">
                    Wine
                  </th>
                  <th className="text-left p-3 font-medium text-sm text-gray-600">
                    Producer
                  </th>
                  <th className="text-left p-3 font-medium text-sm text-gray-600">
                    Color
                  </th>
                  <th className="text-left p-3 font-medium text-sm text-gray-600">
                    Price
                  </th>
                  <th className="text-left p-3 font-medium text-sm text-gray-600">
                    Handle
                  </th>
                  <th className="text-left p-3 font-medium text-sm text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {wines.map((wine) => (
                  <tr
                    key={wine.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="p-3">
                      <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        {wine.label_image_path ? (
                          <Image
                            src={wine.label_image_path}
                            alt={`${wine.wine_name} ${wine.vintage}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {wine.wine_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {wine.vintage}
                        </div>
                        <div className="text-xs text-gray-400">
                          {wine.grape_varieties}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-900">
                      {wine.producer?.name || "Unknown"}
                    </td>
                    <td className="p-3">
                      <Badge
                        className={
                          colorColors[wine.color as keyof typeof colorColors] ||
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {wine.color}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {Math.ceil(wine.base_price_cents / 100)} SEK
                    </td>
                    <td className="p-3 text-sm text-gray-500 font-mono">
                      {wine.handle}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Link href={`/admin/wines/${wine.id}`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <DeleteWineButton
                          wineId={wine.id}
                          wineName={wine.wine_name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {wines.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No wines found</p>
              <Link href="/admin/wines/new">
                <Button>Add your first wine</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
