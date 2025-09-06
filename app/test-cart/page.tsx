"use client";

import { useState, useEffect } from "react";

export default function TestCartPage() {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/crowdvine/cart");
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    }
  };

  const addToCart = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crowdvine/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lines: [
            {
              merchandiseId: "1fc52e4d-a4b9-4c99-b00f-9f5678cd2f61",
              quantity: 1,
            },
          ],
        }),
      });
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (lineId: string, quantity: number) => {
    setLoading(true);
    try {
      const response = await fetch("/api/crowdvine/cart/lines/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineId,
          quantity,
        }),
      });
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error("Failed to update cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (lineId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/crowdvine/cart/lines/remove?lineId=${lineId}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json();
      setCart(data);
    } catch (error) {
      console.error("Failed to remove item:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Cart Test Page</h1>

      <div className="mb-8">
        <button
          onClick={addToCart}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Extralucide to Cart"}
        </button>
      </div>

      <div className="mb-8">
        <button
          onClick={fetchCart}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Refresh Cart
        </button>
      </div>

      {cart && (
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Cart Details</h2>
          <p>
            <strong>Cart ID:</strong> {cart.id}
          </p>
          <p>
            <strong>Total Quantity:</strong> {cart.totalQuantity}
          </p>
          <p>
            <strong>Total Amount:</strong> {cart.cost?.totalAmount?.amount}{" "}
            {cart.cost?.totalAmount?.currencyCode}
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-4">Items:</h3>
          {cart.lines && cart.lines.length > 0 ? (
            <div className="space-y-4">
              {cart.lines.map((line: any) => (
                <div key={line.id} className="border rounded p-4">
                  <p>
                    <strong>Product:</strong> {line.merchandise?.title}
                  </p>
                  <p>
                    <strong>Quantity:</strong> {line.quantity}
                  </p>
                  <p>
                    <strong>Price:</strong> {line.cost?.totalAmount?.amount}{" "}
                    {line.cost?.totalAmount?.currencyCode}
                  </p>

                  <div className="mt-4 space-x-2">
                    <button
                      onClick={() => updateQuantity(line.id, line.quantity + 1)}
                      disabled={loading}
                      className="bg-yellow-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                      +
                    </button>
                    <button
                      onClick={() =>
                        updateQuantity(line.id, Math.max(0, line.quantity - 1))
                      }
                      disabled={loading}
                      className="bg-yellow-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                      -
                    </button>
                    <button
                      onClick={() => removeItem(line.id)}
                      disabled={loading}
                      className="bg-red-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No items in cart</p>
          )}
        </div>
      )}

      <pre className="mt-8 bg-gray-100 p-4 rounded text-sm overflow-auto">
        {JSON.stringify(cart, null, 2)}
      </pre>
    </div>
  );
}
