import { supabaseServer } from '@/lib/supabase-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function AdminDashboard() {
  const sb = await supabaseServer();

  // Hämta statistik
  const [
    { count: producersCount },
    { count: winesCount },
    { count: bookingsCount },
    { count: zonesCount }
  ] = await Promise.all([
    sb.from('producers').select('*', { count: 'exact', head: true }),
    sb.from('wines').select('*', { count: 'exact', head: true }),
    sb.from('bookings').select('*', { count: 'exact', head: true }),
    sb.from('pallet_zones').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your Crowdvine platform</p>
      </div>

      {/* Statistik kort */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{producersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/admin/producers" className="text-blue-600 hover:underline">
                View all →
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winesCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/admin/wines" className="text-blue-600 hover:underline">
                View all →
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/admin/bookings" className="text-blue-600 hover:underline">
                View all →
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{zonesCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/admin/zones" className="text-blue-600 hover:underline">
                View all →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Snabba åtgärder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/producers/new">
              <Button className="w-full" variant="outline">
                Add Producer
              </Button>
            </Link>
            <Link href="/admin/wines/new">
              <Button className="w-full" variant="outline">
                Add Wine
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest bookings and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>No recent activity</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="text-sm text-green-600">✓ Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Stripe</span>
                <span className="text-sm text-green-600">✓ Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auth</span>
                <span className="text-sm text-green-600">✓ Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
