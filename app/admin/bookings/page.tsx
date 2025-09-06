import { supabaseServer } from "@/lib/supabase-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Wine,
  Users,
  Package,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  MoreHorizontal,
} from "lucide-react";

export default async function BookingsPage() {
  const sb = await supabaseServer();

  // Hämta alla bokningar med relaterad data
  const { data: bookings } = await sb
    .from("bookings")
    .select(
      `
      id,
      quantity,
      band,
      created_at,
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
    `,
    )
    .order("created_at", { ascending: false });

  // Beräkna statistik
  const totalBookings = bookings?.length || 0;
  const totalBottles = bookings?.reduce((sum, b) => sum + b.quantity, 0) || 0;
  const totalValue =
    bookings?.reduce(
      (sum, b) => sum + b.quantity * (b.wines?.base_price_cents || 0),
      0,
    ) || 0;

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(priceCents / 100);
  };

  const getStatusColor = (booking: any) => {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(booking.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreated < 1) return "bg-green-100 text-green-800";
    if (daysSinceCreated < 7) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (booking: any) => {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(booking.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreated < 1) return "Recent";
    if (daysSinceCreated < 7) return "This Week";
    return "Older";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage customer wine reservations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalBookings}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Individual reservations
                </p>
              </div>
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Bottles
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalBottles}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bottles reserved
                </p>
              </div>
              <Wine className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Value
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(totalValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated value
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>
                Complete list of all wine reservations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bookings && bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Wine
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Producer
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Pallet
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Quantity
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Price Band
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Value
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Date
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.wines?.wine_name} {booking.wines?.vintage}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.wines?.grape_varieties}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-900">
                        {booking.wines?.producers?.name}
                      </td>
                      <td className="p-3 text-gray-900">
                        {booking.pallets?.name || "No Pallet Assigned"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800"
                        >
                          {booking.quantity} bottles
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-900">{booking.band}</td>
                      <td className="p-3 font-medium text-gray-900">
                        {formatPrice(
                          (booking.wines?.base_price_cents || 0) *
                            booking.quantity,
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            View
                          </Button>
                          <Button size="sm" className="text-xs">
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-900">
                No bookings found
              </h3>
              <p className="text-gray-500">
                When customers make reservations, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
