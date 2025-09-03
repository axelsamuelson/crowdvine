import { Suspense } from 'react';

async function getCart() {
  const res = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/crowdvine/cart`, { 
    cache: 'no-store'
  });
  return res.json();
}

export default async function CheckoutPage() {
  const cart = await getCart();
  
  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      <section>
        <h1 className="text-2xl font-semibold">Checkout (Reservation)</h1>
        
        {/* Cart Summary */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Cart Summary</h2>
          {cart.lines && cart.lines.length > 0 ? (
            <div className="space-y-3">
              {cart.lines.map((line: any) => (
                <div key={line.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{line.merchandise?.title || 'Unknown Wine'}</p>
                    <p className="text-sm text-gray-600">Quantity: {line.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{line.cost?.totalAmount?.amount} {line.cost?.totalAmount?.currencyCode}</p>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total:</span>
                  <span>{cart.cost?.totalAmount?.amount} {cart.cost?.totalAmount?.currencyCode}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Your cart is empty</p>
          )}
        </div>
      </section>

      <form action="/api/checkout/confirm" method="post" className="space-y-4">
        <h2 className="text-lg font-semibold">Delivery address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input name="address.fullName" placeholder="Full name" className="border p-2 rounded" required />
          <input name="address.email" type="email" placeholder="Email" className="border p-2 rounded" required />
          <input name="address.phone" placeholder="Phone" className="border p-2 rounded" />
          <input name="address.street" placeholder="Street address" className="border p-2 rounded" required />
          <input name="address.postcode" placeholder="Postcode" className="border p-2 rounded" required />
          <input name="address.city" placeholder="City" className="border p-2 rounded" required />
          <input name="address.countryCode" placeholder="Country code (e.g. SE)" className="border p-2 rounded" required />
        </div>
        
        <h2 className="text-lg font-semibold mt-6">Payment method</h2>
        <p className="text-sm text-gray-600">
          Add a payment method (no charge now). We only charge when the matching pallet is triggered.
        </p>
        <a href="/api/checkout/setup" className="inline-block border px-3 py-2 rounded">
          Add/Update payment method
        </a>
        
        <div className="pt-6">
          <button 
            type="submit"
            className="border px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
            disabled={!cart.lines || cart.lines.length === 0}
          >
            Place reservation
          </button>
        </div>
      </form>
    </div>
  );
}
