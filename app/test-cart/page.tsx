"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/components/cart/cart-context";
import { testServerAction, testServerActionWithError } from "@/components/cart/test-actions";
import { simpleAddItem } from "@/components/cart/simple-actions";

// Mock product data for testing
const mockProduct = {
  id: "test-wine-123",
  title: "Test Wine 2020",
  handle: "test-wine-2020",
  description: "A test wine for cart functionality",
  descriptionHtml: "<p>A test wine for cart functionality</p>",
  productType: "wine",
  categoryId: "",
  options: [
    {
      id: "color",
      name: "Color",
      values: [
        { id: "red", name: "Red" }
      ]
    }
  ],
  variants: [
    {
      id: "test-wine-123-default",
      title: "750 ml",
      availableForSale: true,
      price: {
        amount: "299.00",
        currencyCode: "SEK"
      },
      selectedOptions: [
        { name: "Color", value: "Red" }
      ]
    }
  ],
  priceRange: {
    minVariantPrice: {
      amount: "299.00",
      currencyCode: "SEK"
    },
    maxVariantPrice: {
      amount: "299.00",
      currencyCode: "SEK"
    }
  },
  featuredImage: {
    id: "test-wine-123-img",
    url: "/placeholder-wine.jpg",
    altText: "Test Wine 2020",
    width: 600,
    height: 600
  },
  images: [
    {
      id: "test-wine-123-img",
      url: "/placeholder-wine.jpg",
      altText: "Test Wine 2020",
      width: 600,
      height: 600
    }
  ],
  seo: { title: "Test Wine 2020", description: "A test wine" },
  tags: ["red", "wine"],
  availableForSale: true,
  currencyCode: "SEK",
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString()
};

export default function TestCartPage() {
  const { cart, addItem, isPending } = useCart();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testAddToCart = async () => {
    addTestResult("🚀 Starting add to cart test...");
    
    const initialItemCount = cart?.lines.length || 0;
    const initialTotalQuantity = cart?.totalQuantity || 0;
    
    addTestResult(`📊 Initial state: ${initialItemCount} items, total quantity: ${initialTotalQuantity}`);
    addTestResult(`🔍 Variant ID: ${mockProduct.variants[0].id}`);
    addTestResult(`🔍 Product ID: ${mockProduct.id}`);
    addTestResult(`🔍 Is Pending: ${isPending}`);
    
    try {
      // Test 0: Test basic server actions
      addTestResult("📤 Testing basic server action...");
      try {
        const basicResult = await testServerAction();
        addTestResult(`📥 Basic server action: ${basicResult}`);
      } catch (error) {
        addTestResult(`❌ Basic server action failed: ${error}`);
      }
      
      // Test 1: Try simple server action
      addTestResult("📤 Testing simple cart server action...");
      try {
        const simpleResult = await simpleAddItem(mockProduct.variants[0].id);
        addTestResult(`📥 Simple cart server action: ${simpleResult}`);
      } catch (error) {
        addTestResult(`❌ Simple cart server action failed: ${error}`);
      }
      
      // Test 2: Try full cart server action
      addTestResult("📤 Testing full cart server action...");
      const serverActionResult = await addItem(mockProduct.variants[0], mockProduct);
      addTestResult(`📥 Full cart server action returned: ${serverActionResult ? 'success' : 'null/undefined'}`);
      
      // Test 3: Try test API route
      addTestResult("📤 Testing test API route...");
      const testApiResponse = await fetch('/api/cart/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: mockProduct.variants[0].id })
      });
      
      const testApiResult = await testApiResponse.json();
      addTestResult(`📥 Test API response: ${testApiResult.success ? 'success' : 'failed'}`);
      
      // Test 4: Try step-by-step API route
      addTestResult("📤 Testing step-by-step API route...");
      const stepApiResponse = await fetch('/api/cart/add-item-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: mockProduct.variants[0].id })
      });
      
      const stepApiResult = await stepApiResponse.json();
      addTestResult(`📥 Step API response: ${stepApiResult.success ? 'success' : 'failed'}`);
      
      if (stepApiResult.success && stepApiResult.cart) {
        addTestResult(`📊 Step API has ${stepApiResult.cart.lines.length} items, total quantity: ${stepApiResult.cart.totalQuantity}`);
      } else {
        addTestResult(`❌ Step API error: ${stepApiResult.error}`);
      }
      
      // Test 5: Try original cart API route
      addTestResult("📤 Testing original cart API route...");
      const cartApiResponse = await fetch('/api/cart/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: mockProduct.variants[0].id })
      });
      
      const cartApiResult = await cartApiResponse.json();
      addTestResult(`📥 Cart API response: ${cartApiResult.success ? 'success' : 'failed'}`);
      
      if (cartApiResult.success && cartApiResult.cart) {
        addTestResult(`📊 Cart API has ${cartApiResult.cart.lines.length} items, total quantity: ${cartApiResult.cart.totalQuantity}`);
      } else {
        addTestResult(`❌ Cart API error: ${cartApiResult.error}`);
      }
      
      // Test 4: Try old test API route
      addTestResult("📤 Testing old test API route...");
      const baseId = mockProduct.variants[0].id.replace("-default", "");
      const apiResponse = await fetch('/api/test-server-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wineId: baseId })
      });
      
      const apiResult = await apiResponse.json();
      addTestResult(`📥 Old API response: ${apiResult.success ? 'success' : 'failed'}`);
      
      if (apiResult.success && apiResult.cart) {
        addTestResult(`📊 Old API cart has ${apiResult.cart.lines.length} items, total quantity: ${apiResult.cart.totalQuantity}`);
      } else {
        addTestResult(`❌ Old API error: ${apiResult.error}`);
      }
      
      // Check immediate state
      const immediateItemCount = cart?.lines.length || 0;
      const immediateTotalQuantity = cart?.totalQuantity || 0;
      addTestResult(`📊 Immediate state: ${immediateItemCount} items, total quantity: ${immediateTotalQuantity}`);
      
      // Wait a bit for the update to complete
      setTimeout(() => {
        const finalItemCount = cart?.lines.length || 0;
        const finalTotalQuantity = cart?.totalQuantity || 0;
        const finalIsPending = isPending;
        
        addTestResult(`📊 Final state: ${finalItemCount} items, total quantity: ${finalTotalQuantity}`);
        addTestResult(`📊 Final isPending: ${finalIsPending}`);
        
        if (finalItemCount === 1 && finalTotalQuantity === initialTotalQuantity + 1) {
          addTestResult("✅ SUCCESS: Item added correctly!");
        } else if (finalItemCount > initialItemCount) {
          addTestResult("❌ ISSUE: New item created instead of incrementing existing");
        } else {
          addTestResult("❌ ISSUE: Item not added or disappeared");
        }
      }, 2000);
      
    } catch (error) {
      addTestResult(`❌ ERROR: ${error}`);
      console.error("Add to cart error:", error);
    }
  };

  const clearCart = () => {
    setTestResults([]);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>🧪 Cart Functionality Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Cart State */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Current Cart State:</h3>
            <div className="text-sm space-y-1">
              <div>Items: {cart?.lines.length || 0}</div>
              <div>Total Quantity: {cart?.totalQuantity || 0}</div>
              <div>Total Amount: {cart?.cost.totalAmount.amount} {cart?.cost.totalAmount.currencyCode}</div>
              <div>Is Pending: {isPending ? "Yes" : "No"}</div>
            </div>
          </div>

          {/* Cart Items */}
          {cart?.lines && cart.lines.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Cart Items:</h3>
              {cart.lines.map((item, index) => (
                <div key={item.id} className="text-sm border-b pb-2 mb-2 last:border-b-0">
                  <div>ID: {item.id}</div>
                  <div>Merchandise ID: {item.merchandise.id}</div>
                  <div>Title: {item.merchandise.title}</div>
                  <div>Quantity: {item.quantity}</div>
                  <div>Price: {item.cost.totalAmount.amount} {item.cost.totalAmount.currencyCode}</div>
                  <div>Color: {item.merchandise.selectedOptions.find(opt => opt.name === "Color")?.value || "None"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Test Controls */}
          <div className="flex gap-4">
            <Button 
              onClick={testAddToCart} 
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? "Adding..." : "Add Test Wine to Cart"}
            </Button>
            <Button 
              onClick={clearTestResults} 
              variant="outline"
            >
              Clear Test Results
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              <h3 className="font-semibold mb-2 text-white">Test Results:</h3>
              {testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Test Instructions:</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Click "Add Test Wine to Cart" multiple times</li>
              <li>Watch the cart state and test results</li>
              <li>Verify that quantity increments instead of creating new items</li>
              <li>Check that the color information is preserved</li>
              <li>Ensure items don't disappear after adding</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}