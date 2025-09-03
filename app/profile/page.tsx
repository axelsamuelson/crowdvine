import { Suspense } from 'react';

async function getReservations() {
  const res = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/me/reservations`, { 
    cache: 'no-store' 
  });
  return res.json();
}

export default async function ProfilePage() {
  const reservations = await getReservations();
  
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <section>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-gray-600 mt-2">View your reservations and order status</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Reservations</h2>
        {reservations && reservations.length > 0 ? (
          <div className="space-y-4">
            {reservations.map((reservation: any) => (
              <div key={reservation.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">Reservation #{reservation.id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(reservation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    reservation.status === 'placed' ? 'bg-yellow-100 text-yellow-800' :
                    reservation.status === 'allocated' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {reservation.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Delivery Address</h4>
                    <div className="text-sm text-gray-600">
                      <p>{reservation.user_addresses?.full_name}</p>
                      <p>{reservation.user_addresses?.address_street}</p>
                      <p>{reservation.user_addresses?.address_postcode} {reservation.user_addresses?.address_city}</p>
                      <p>{reservation.user_addresses?.country_code}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Delivery Zone</h4>
                    <p className="text-sm text-gray-600">
                      {reservation.pallet_zones?.name || 'Not assigned yet'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Wines</h4>
                  <div className="space-y-2">
                    {reservation.order_reservation_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span>{item.wines?.wine_name} {item.wines?.vintage}</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No reservations found</p>
            <a href="/shop" className="text-blue-600 hover:underline mt-2 inline-block">
              Browse wines
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
