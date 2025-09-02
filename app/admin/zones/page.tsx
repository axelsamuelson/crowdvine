import Link from 'next/link';
import { getPalletZones } from '@/lib/actions/zones';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteZoneButton } from '@/components/admin/delete-zone-button';

export default async function ZonesPage() {
  const zones = await getPalletZones();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pallet Zones</h1>
          <p className="text-gray-600">Manage delivery zones</p>
        </div>
        <Link href="/admin/zones/new">
          <Button>Add Zone</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{zone.name}</CardTitle>
                  <CardDescription>
                    Delivery zone configuration
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {zone.radius_km} km
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <p><strong>Center:</strong> {zone.center_lat.toFixed(4)}, {zone.center_lon.toFixed(4)}</p>
                  <p><strong>Radius:</strong> {zone.radius_km} kilometers</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-gray-400">
                    ID: {zone.id.slice(0, 8)}...
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/admin/zones/${zone.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <DeleteZoneButton zoneId={zone.id} zoneName={zone.name} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {zones.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No zones found</p>
            <Link href="/admin/zones/new">
              <Button>Add your first zone</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
