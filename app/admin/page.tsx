import { supabaseServer } from '@/lib/supabase-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Wine, 
  Calendar, 
  MapPin, 
  Package, 
  TrendingUp, 
  Plus, 
  Activity,
  CheckCircle,
  AlertCircle,
  Database,
  CreditCard,
  Shield,
  FileText
} from 'lucide-react';

export default async function AdminDashboard() {
  const sb = await supabaseServer();

  // Hämta statistik
  const [
    { count: producersCount },
    { count: winesCount },
    { count: bookingsCount },
    { count: zonesCount },
    { count: palletsCount },
    { data: recentBookings },
    { data: recentPallets }
  ] = await Promise.all([
    sb.from('producers').select('*', { count: 'exact', head: true }),
    sb.from('wines').select('*', { count: 'exact', head: true }),
    sb.from('bookings').select('*', { count: 'exact', head: true }),
    sb.from('pallet_zones').select('*', { count: 'exact', head: true }),
    sb.from('pallets').select('*', { count: 'exact', head: true }),
    sb.from('bookings').select(`
      id,
      quantity,
      created_at,
      wines(wine_name, vintage, producers(name))
    `).order('created_at', { ascending: false }).limit(5),
    sb.from('pallets').select(`
      id,
      name,
      bottle_capacity,
      bookings(quantity)
    `).limit(5)
  ]);

  // Beräkna pallet statistik
  const palletStats = recentPallets?.map(pallet => {
    const totalBooked = pallet.bookings?.reduce((sum, b) => sum + b.quantity, 0) || 0;
    const percentage = (totalBooked / pallet.bottle_capacity) * 100;
    return { ...pallet, totalBooked, percentage };
  }) || [];

  const totalBookedBottles = palletStats.reduce((sum, p) => sum + p.totalBooked, 0);
  const totalCapacity = palletStats.reduce((sum, p) => sum + p.bottle_capacity, 0);
  const overallCompletion = totalCapacity > 0 ? (totalBookedBottles / totalCapacity) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage your Crowdvine platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/producers/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Producer
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/wines/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Wine
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Producers</p>
                <p className="text-3xl font-bold text-blue-600">{producersCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Wine producers in system
                </p>
              </div>
              <Users className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Wines</p>
                <p className="text-3xl font-bold text-purple-600">{winesCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Available wines
                </p>
              </div>
              <Wine className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-3xl font-bold text-green-600">{bookingsCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bottles reserved
                </p>
              </div>
              <Calendar className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zones</p>
                <p className="text-2xl font-bold">{zonesCount || 0}</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pallets</p>
                <p className="text-2xl font-bold">{palletsCount || 0}</p>
              </div>
              <Package className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold">{overallCompletion.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pallet Progress */}
      {palletStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pallet Status Overview
            </CardTitle>
            <CardDescription>
              Current bottle capacity and completion status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {palletStats.map((pallet) => (
              <div key={pallet.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{pallet.name}</span>
                  <Badge variant={pallet.percentage >= 100 ? "default" : "secondary"}>
                    {pallet.percentage.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={pallet.percentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{pallet.totalBooked} / {pallet.bottle_capacity} bottles</span>
                  <span>{pallet.bottle_capacity - pallet.totalBooked} remaining</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Bookings
            </CardTitle>
            <CardDescription>
              Latest wine reservations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentBookings && recentBookings.length > 0 ? (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">
                        {booking.wines?.wine_name} {booking.wines?.vintage}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.wines?.producers?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{booking.quantity} bottles</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent bookings</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Platform health and connectivity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Database</span>
                </div>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Stripe</span>
                </div>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Authentication</span>
                </div>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/admin/producers">
                <Users className="h-6 w-6 mb-2" />
                <span>Manage Producers</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/admin/wines">
                <Wine className="h-6 w-6 mb-2" />
                <span>Manage Wines</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/admin/pallets">
                <Package className="h-6 w-6 mb-2" />
                <span>Manage Pallets</span>
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/admin/bookings">
                <Calendar className="h-6 w-6 mb-2" />
                <span>View Bookings</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/admin/content">
                <FileText className="h-6 w-6 mb-2" />
                <span>Content</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
