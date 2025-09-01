import { getBookings } from '@/lib/actions/bookings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default async function BookingsPage() {
  const bookings = await getBookings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600">View customer bookings and orders</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {booking.wine?.wine_name || 'Unknown Wine'} {booking.wine?.vintage}
                  </CardTitle>
                  <CardDescription>
                    Handle: {booking.wine?.handle || 'N/A'}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Badge variant="secondary">
                    {booking.quantity} bottles
                  </Badge>
                  <Badge variant="outline">
                    {booking.band}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Booking ID: {booking.id.slice(0, 8)}...</span>
                  <span>Item ID: {booking.item_id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Status: {booking.status || 'active'}</span>
                  <span>
                    {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bookings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">No bookings found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
