"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { addItem } from "@/components/cart/actions";

export default function TestShopSimulationPage() {
  const [result, setResult] = useState<string>("");
  const [wineId, setWineId] = useState<string>("");

  const getWineId = async () => {
    try {
      console.log("Getting wine ID...");
      const response = await fetch("/api/crowdvine/products");
      const wines = await response.json();

      if (wines.length > 0) {
        const firstWine = wines[0];
        setWineId(firstWine.id);
        setResult(`Found wine ID: ${firstWine.id} (${firstWine.title})`);
      } else {
        setResult("No wines found");
      }
    } catch (error) {
      console.error("Error getting wine ID:", error);
      setResult(`Error: ${error}`);
    }
  };

  const testShopAddItem = async () => {
    if (!wineId) {
      setResult("Please get a wine ID first");
      return;
    }

    try {
      console.log("Testing shop addItem server action...");

      // Create variant ID like shop does
      const variantId = wineId + "-default";
      console.log("Using variant ID:", variantId);

      // Call the actual server action that shop uses
      const cart = await addItem(variantId);
      console.log("Server action result:", cart);

      setResult(
        `Shop AddItem Test:\nVariant ID: ${variantId}\nResult: ${JSON.stringify(cart, null, 2)}`,
      );
    } catch (error) {
      console.error("Shop addItem error:", error);
      setResult(`Shop addItem error: ${error}`);
    }
  };

  const testDirectAPI = async () => {
    if (!wineId) {
      setResult("Please get a wine ID first");
      return;
    }

    try {
      console.log("Testing direct API call...");

      // Create variant ID
      const variantId = wineId + "-default";
      console.log("Using variant ID:", variantId);

      // Call API directly (like test page does)
      const cartResponse = await fetch("/api/crowdvine/cart", {
        method: "POST",
      });

      const cart = await cartResponse.json();
      console.log("Cart created:", cart);

      // Add item with variant ID
      const addResponse = await fetch(
        `/api/crowdvine/cart/${cart.id}/lines/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lines: [{ merchandiseId: variantId, quantity: 1 }],
          }),
        },
      );

      const addResult = await addResponse.json();
      console.log("Add result:", addResult);

      setResult(
        `Direct API Test:\nVariant ID: ${variantId}\nCart: ${JSON.stringify(cart, null, 2)}\nAdd: ${JSON.stringify(addResult, null, 2)}`,
      );
    } catch (error) {
      console.error("Direct API error:", error);
      setResult(`Direct API error: ${error}`);
    }
  };

  const testCookieComparison = async () => {
    try {
      console.log("Testing cookie comparison...");

      // Get cookies before any action
      const cookiesBefore = document.cookie;
      console.log("Cookies before:", cookiesBefore);

      // Test server action
      const variantId = wineId + "-default";
      console.log("Testing server action with variant ID:", variantId);

      const serverActionResult = await addItem(variantId);
      console.log("Server action result:", serverActionResult);

      // Get cookies after server action
      const cookiesAfterServer = document.cookie;
      console.log("Cookies after server action:", cookiesAfterServer);

      // Test direct API
      const directAPIResult = await fetch("/api/crowdvine/cart", {
        method: "POST",
      });
      const directCart = await directAPIResult.json();
      console.log("Direct API cart:", directCart);

      // Get cookies after direct API
      const cookiesAfterDirect = document.cookie;
      console.log("Cookies after direct API:", cookiesAfterDirect);

      setResult(
        `Cookie Comparison:\nBefore: ${cookiesBefore}\nAfter Server Action: ${cookiesAfterServer}\nAfter Direct API: ${cookiesAfterDirect}\n\nServer Action Result: ${JSON.stringify(serverActionResult, null, 2)}\nDirect API Result: ${JSON.stringify(directCart, null, 2)}`,
      );
    } catch (error) {
      console.error("Cookie comparison error:", error);
      setResult(`Cookie comparison error: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Shop Simulation Test Page</h1>

      <div className="space-y-4 mb-6">
        <Button onClick={getWineId} variant="outline">
          Get Wine ID
        </Button>
        <Button onClick={testShopAddItem} disabled={!wineId}>
          Test Shop AddItem Server Action
        </Button>
        <Button onClick={testDirectAPI} disabled={!wineId} variant="outline">
          Test Direct API Call
        </Button>
        <Button
          onClick={testCookieComparison}
          disabled={!wineId}
          variant="outline"
        >
          Test Cookie Comparison
        </Button>
      </div>

      <div className="p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Result:</h2>
        <pre className="text-sm whitespace-pre-wrap">{result}</pre>
      </div>

      <div className="mt-4 p-4 border rounded">
        <h2 className="font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Get Wine ID" to fetch a real wine ID</li>
          <li>
            Click "Test Shop AddItem Server Action" to test the exact server
            action shop uses
          </li>
          <li>
            Click "Test Direct API Call" to test the same flow with direct API
            calls
          </li>
          <li>
            Click "Test Cookie Comparison" to compare cookie behavior between
            server action and direct API
          </li>
          <li>Check browser console for detailed logs</li>
          <li>
            Compare results to understand why server action fails but direct API
            works
          </li>
        </ol>
      </div>
    </div>
  );
}
