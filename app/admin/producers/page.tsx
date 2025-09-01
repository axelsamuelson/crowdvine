import Link from 'next/link';
import { getProducers } from '@/lib/actions/producers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function ProducersPage() {
  const producers = await getProducers();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Producers</h1>
          <p className="text-gray-600">Manage wine producers</p>
        </div>
        <Link href="/admin/producers/new">
          <Button>Add Producer</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {producers.map((producer) => (
          <Card key={producer.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{producer.name}</CardTitle>
                  <CardDescription>{producer.region}</CardDescription>
                </div>
                <Badge variant="secondary">{producer.country_code}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{producer.short_description}</p>
                <div className="text-sm text-gray-500">
                  <p>{producer.address_street}</p>
                  <p>{producer.address_city}, {producer.address_postcode}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-gray-400">
                    {producer.lat.toFixed(4)}, {producer.lon.toFixed(4)}
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/admin/producers/${producer.id}`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
