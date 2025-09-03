import { supabaseServer } from '@/lib/supabase-server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { 
  Calendar, 
  Wine, 
  Users, 
  Package, 
  TrendingUp, 
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default async function BookingsPage() {
  const sb = await supabaseServer();

  // Hämta alla bokningar med relaterad data
  const { data: bookings } = await sb
    .from('bookings')
    .select(`
      id,
      quantity,
      price_band,
      created_at,
      updated_at,
      wines(
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        base_price_cents,
        producers(
          name,
          region,
          country_code
        )
      ),
      pallets(
        id,
        name,
        bottle_capacity,
        delivery_zone:pallet_zones!delivery_zone_id(name),
        pickup_zone:pallet_zones!pickup_zone_id(name)
      )
    `)
    .order('created_at', { ascending: false });

  // Beräkna statistik
  const totalBookings = bookings?.length || 0;
  const totalBottles = bookings?.reduce((sum, b) => sum + b.quantity, 0) || 0;
  const totalValue = bookings?.reduce((sum, b) => sum + (b.quantity * (b.wines?.base_price_cents || 0)), 0) || 0;
  const recentBookings = bookings?.slice(0, 5) || [];

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(priceCents / 100);
  };

  const getStatusColor = (booking: any) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated < 1) return 'bg-green-100 text-green-800';
    if (daysSinceCreated < 7) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (booking: any) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated < 1) return 'Recent';
    if (daysSinceCreated < 7) return 'This Week';
    return 'Older';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Bookings Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor customer reservations and wine allocations
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-3xl font-bold text-blue-600">{totalBookings}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Individual reservations
                </p>
              </div>
              <Calendar className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bottles</p>
                <p className="text-3xl font-bold text-purple-600">{totalBottles}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bottles reserved
                </p>
              </div>
              <Wine className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-3xl font-bold text-green-600">{formatPrice(totalValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated value
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Bookings
          </CardTitle>
          <CardDescription>
            Latest wine reservations and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings.length > 0 ? (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Wine className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-lg">
                          {booking.wines?.wine_name} {booking.wines?.vintage}
                        </h3>
                        <Badge variant="outline" className={getStatusColor(booking)}>
                          {getStatusText(booking)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Producer:</span>
                          <span className="font-medium">{booking.wines?.producers?.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Pallet:</span>
                          <span className="font-medium">{booking.pallets?.name || 'Unassigned'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Route:</span>
                          <span className="font-medium">
                            {booking.pallets?.pickup_zone?.name} → {booking.pallets?.delivery_zone?.name}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Price Band:</span>
                          <span className="font-medium">{booking.price_band}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-green-600">
                        {booking.quantity}
                      </div>
                      <div className="text-sm text-muted-foreground">bottles</div>
                      <div className="text-sm font-medium mt-1">
                        {formatPrice((booking.wines?.base_price_cents || 0) * booking.quantity)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>ID: {booking.id.slice(0, 8)}...</span>
                      <span>Created: {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No bookings found</h3>
              <p className="text-muted-foreground">
                When customers make reservations, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Bookings Table */}
      {bookings && bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Bookings</CardTitle>
            <CardDescription>
              Complete list of all wine reservations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Wine</th>
                    <th className="text-left p-3 font-medium">Producer</th>
                    <th className="text-left p-3 font-medium">Pallet</th>
                    <th className="text-left p-3 font-medium">Quantity</th>
                    <th className="text-left p-3 font-medium">Price Band</th>
                    <th className="text-left p-3 font-medium">Value</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{booking.wines?.wine_name} {booking.wines?.vintage}</div>
                          <div className="text-sm text-muted-foreground">{booking.wines?.grape_varieties}</div>
                        </div>
                      </td>
                      <td className="p-3">{booking.wines?.producers?.name}</td>
                      <td className="p-3">{booking.pallets?.name || 'Unassigned'}</td>
                      <td className="p-3">
                        <Badge variant="secondary">{booking.quantity} bottles</Badge>
                      </td>
                      <td className="p-3">{booking.price_band}</td>
                      <td className="p-3 font-medium">
                        {formatPrice((booking.wines?.base_price_cents || 0) * booking.quantity)}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">View</Button>
                          <Button size="sm">Edit</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
