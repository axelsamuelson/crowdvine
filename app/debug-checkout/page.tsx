"use client";

import { useState } from "react";

export default function DebugCheckoutPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testCart = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crowdvine/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: [
            {
              merchandiseId: "1fc52e4d-a4b9-4c99-b00f-9f5678cd2f61-default",
              quantity: 1,
            },
          ],
        }),
      });
      const data = await response.json();
      setResult(
        `Cart Test: ${response.status} - ${JSON.stringify(data, null, 2)}`,
      );
    } catch (error) {
      setResult(`Cart Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            fullName: "Test User",
            email: "test@example.com",
            phone: "123456789",
            street: "Test Street",
            postcode: "12345",
            city: "Test City",
            countryCode: "SE",
          },
        }),
      });

      if (response.redirected) {
        setResult(`Checkout Redirected: ${response.url}`);
      } else {
        const data = await response.json();
        setResult(
          `Checkout Test: ${response.status} - ${JSON.stringify(data, null, 2)}`,
        );
      }
    } catch (error) {
      setResult(`Checkout Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Debug Checkout</h1>

      <div className="space-y-4 mb-6">
        <button
          onClick={testCart}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Cart
        </button>

        <button
          onClick={testCheckout}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-4"
        >
          Test Checkout
        </button>
      </div>

      {loading && <div className="text-blue-600">Loading...</div>}

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="text-sm overflow-auto">{result}</pre>
        </div>
      )}
    </div>
  );
}
