'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Cart } from '@/lib/shopify/types';

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [zoneInfo, setZoneInfo] = useState<{
    pickupZone: string | null;
    deliveryZone: string | null;
    pallets?: Array<{
      id: string;
      name: string;
      currentBottles: number;
      maxBottles: number;
      remainingBottles: number;
      pickupZoneName: string;
      deliveryZoneName: string;
    }>;
  }>({ pickupZone: null, deliveryZone: null });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    postcode: '',
    city: '',
    countryCode: ''
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if payment method was successfully added
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');
    
    if (success === 'true' && sessionId) {
      setPaymentSuccess(true);
      // Clear the URL parameters to avoid showing the message again on refresh
      window.history.replaceState({}, '', '/checkout');
    }
    
    // Restore form data from session storage
    const savedFormData = sessionStorage.getItem('checkoutFormData');
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormData(parsedData);
      } catch (error) {
        console.error('Failed to parse saved form data:', error);
      }
    }
    
    // Restore zone info from session storage
    const savedZoneInfo = sessionStorage.getItem('checkoutZoneInfo');
    if (savedZoneInfo) {
      try {
        const parsedZoneInfo = JSON.parse(savedZoneInfo);
        setZoneInfo(parsedZoneInfo);
      } catch (error) {
        console.error('Failed to parse saved zone info:', error);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchCart() {
      try {
        const response = await fetch('/api/crowdvine/cart');
        if (response.ok) {
          const cartData = await response.json();
          setCart(cartData);
          
          // Fetch zone information if cart has items
          if (cartData.totalQuantity > 0) {
            // Only fetch zone info if we have a complete delivery address
            const hasCompleteAddress = formData.postcode && formData.city && formData.countryCode;
            
            if (hasCompleteAddress) {
              const zoneResponse = await fetch('/api/checkout/zones', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  cartItems: cartData.lines,
                  deliveryAddress: {
                    postcode: formData.postcode,
                    city: formData.city,
                    countryCode: formData.countryCode
                  }
                })
              });
              
              if (zoneResponse.ok) {
                const zoneData = await zoneResponse.json();
                const newZoneInfo = {
                  pickupZone: zoneData.pickupZoneName,
                  deliveryZone: zoneData.deliveryZoneName,
                  pallets: zoneData.pallets
                };
                setZoneInfo(newZoneInfo);
                
                // Save zone info to session storage
                sessionStorage.setItem('checkoutZoneInfo', JSON.stringify(newZoneInfo));
              }
            } else {
              // Only show pickup zone if no complete delivery address
              const zoneResponse = await fetch('/api/checkout/zones', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  cartItems: cartData.lines,
                  deliveryAddress: {
                    postcode: '',
                    city: '',
                    countryCode: ''
                  }
                })
              });
              
              if (zoneResponse.ok) {
                const zoneData = await zoneResponse.json();
                const newZoneInfo = {
                  pickupZone: zoneData.pickupZoneName,
                  deliveryZone: null, // Don't show delivery zone yet
                  pallets: zoneData.pallets
                };
                setZoneInfo(newZoneInfo);
                
                // Save zone info to session storage
                sessionStorage.setItem('checkoutZoneInfo', JSON.stringify(newZoneInfo));
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCart();
  }, [formData]); // Add formData as dependency so it runs when formData changes

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: value
    };
    setFormData(updatedFormData);
    
    // Save form data to session storage
    sessionStorage.setItem('checkoutFormData', JSON.stringify(updatedFormData));
    
    // Update zone information if address fields changed
    if (['postcode', 'city', 'countryCode'].includes(name) && cart) {
      updateZoneInfo(updatedFormData);
    }
  };

  const handlePaymentSetup = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      alert('Please enter your email first');
      return;
    }

    // Save current form data before redirecting to Stripe
    sessionStorage.setItem('checkoutFormData', JSON.stringify(formData));

    try {
      const response = await fetch(`/api/checkout/setup?email=${encodeURIComponent(formData.email)}&name=${encodeURIComponent(formData.fullName)}`);
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL received:', data);
        alert('Failed to setup payment method');
      }
    } catch (error) {
      console.error('Payment setup error:', error);
      alert('Failed to setup payment method');
    }
  };

  const updateZoneInfo = async (currentFormData: typeof formData) => {
    if (!cart || cart.totalQuantity === 0) return;
    
    try {
      // Only fetch zone info if we have a complete delivery address
      const hasCompleteAddress = currentFormData.postcode && currentFormData.city && currentFormData.countryCode;
      
      const zoneResponse = await fetch('/api/checkout/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: cart.lines,
          deliveryAddress: hasCompleteAddress ? {
            postcode: currentFormData.postcode,
            city: currentFormData.city,
            countryCode: currentFormData.countryCode
          } : {
            postcode: '',
            city: '',
            countryCode: ''
          }
        })
      });
      
      if (zoneResponse.ok) {
        const zoneData = await zoneResponse.json();
        const newZoneInfo = {
          pickupZone: zoneData.pickupZoneName,
          deliveryZone: hasCompleteAddress ? zoneData.deliveryZoneName : null,
          pallets: hasCompleteAddress ? zoneData.pallets : []
        };
        
        setZoneInfo(newZoneInfo);
        
        // Save zone info to session storage
        sessionStorage.setItem('checkoutZoneInfo', JSON.stringify(newZoneInfo));
      }
    } catch (error) {
      console.error('Failed to update zone info:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!cart || cart.totalQuantity === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
        <p className="text-gray-600">Your cart is empty. Please add some items before proceeding to checkout.</p>
        <a href="/" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Payment Success Message */}
      {paymentSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Payment Method Added Successfully!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your payment method has been saved and will be used when your pallet is triggered.
              </p>
            </div>
          </div>
        </div>
      )}

      <section>
        <h1 className="text-2xl font-semibold mb-4">Checkout (Reservation)</h1>
        
        {/* Cart Summary */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2">
            {cart.lines.map((line) => (
              <div key={line.id} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{line.merchandise.title}</span>
                  <span className="text-gray-600 ml-2">x{line.quantity}</span>
                </div>
                <span className="font-medium">{line.cost.totalAmount.amount} {line.cost.totalAmount.currencyCode}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span>Total</span>
              <span>{cart.cost.totalAmount.amount} {cart.cost.totalAmount.currencyCode}</span>
            </div>
          </div>
          
          {/* Zone Information */}
          {(zoneInfo.pickupZone || zoneInfo.deliveryZone) && (
            <div className="border-t pt-3 mt-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Zone Information</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {zoneInfo.pickupZone && (
                  <div>
                    <span className="font-medium">Pickup Zone:</span> {zoneInfo.pickupZone}
                  </div>
                )}
                {zoneInfo.deliveryZone && (
                  <div>
                    <span className="font-medium">Delivery Zone:</span> {zoneInfo.deliveryZone}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Pallet Information */}
          {zoneInfo.pallets && zoneInfo.pallets.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Available Pallets</h3>
              <div className="space-y-2">
                {zoneInfo.pallets.map((pallet) => (
                  <div key={pallet.id} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{pallet.name}</span>
                      <span className="text-xs text-gray-500">
                        {pallet.currentBottles}/{pallet.maxBottles} bottles
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(pallet.currentBottles / pallet.maxBottles) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {pallet.remainingBottles} bottles remaining
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <form action="/api/checkout/confirm" method="post" className="space-y-6">
        {/* Customer Details */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </section>

        {/* Delivery Address */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                id="street"
                name="street"
                type="text"
                required
                value={formData.street}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter street address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode *
                </label>
                <input
                  id="postcode"
                  name="postcode"
                  type="text"
                  required
                  value={formData.postcode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter postcode"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <select
                  id="countryCode"
                  name="countryCode"
                  required
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select country</option>
                  <option value="SE">Sweden</option>
                  <option value="NO">Norway</option>
                  <option value="DK">Denmark</option>
                  <option value="FI">Finland</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Method */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">
              <strong>Reservation Checkout:</strong> No payment will be charged now. We only charge when the matching pallet is triggered.
            </p>
            {paymentSuccess ? (
              <div className="flex items-center text-green-600">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Payment method saved</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePaymentSetup}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add/Update Payment Method
              </button>
            )}
          </div>
        </section>

        {/* Submit Button */}
        <div className="pt-6">
          <button
            type="submit"
            onClick={() => {
              // Clear form data and zone info from session storage when placing reservation
              sessionStorage.removeItem('checkoutFormData');
              sessionStorage.removeItem('checkoutZoneInfo');
            }}
            className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Place Reservation
          </button>
        </div>
      </form>
    </div>
  );
}
