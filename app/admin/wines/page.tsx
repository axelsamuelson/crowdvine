import Link from 'next/link';
import Image from 'next/image';
import { getWines } from '@/lib/actions/wines';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteWineButton } from '@/components/admin/delete-wine-button';

const colorColors = {
  red: 'bg-red-100 text-red-800',
  white: 'bg-yellow-100 text-yellow-800',
  rose: 'bg-pink-100 text-pink-800',
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
        <Link href="/admin/wines/new">
          <Button>Add Wine</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wines.map((wine) => (
          <Card key={wine.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{wine.wine_name}</CardTitle>
                  <CardDescription>
                    {wine.vintage} • {wine.producer?.name || 'Unknown Producer'}
                  </CardDescription>
                </div>
                <Badge className={colorColors[wine.color as keyof typeof colorColors] || 'bg-gray-100 text-gray-800'}>
                  {wine.color}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Wine Image */}
              {wine.label_image_path && (
                <div className="mb-4">
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={wine.label_image_path}
                      alt={`${wine.wine_name} ${wine.vintage}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{wine.grape_varieties}</p>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">
                    {(wine.base_price_cents / 100).toFixed(2)} SEK
                  </div>
                  <div className="text-xs text-gray-400">
                    Handle: {wine.handle}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-gray-400">
                    ID: {wine.id.slice(0, 8)}...
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/admin/wines/${wine.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {wines.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No wines found</p>
            <Link href="/admin/wines/new">
              <Button>Add your first wine</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
