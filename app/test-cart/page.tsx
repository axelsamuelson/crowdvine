'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function TestCartPage() {
  const [result, setResult] = useState<string>('');

  const testCartCreation = async () => {
    try {
      console.log('Testing cart creation...');
      const response = await fetch('/api/crowdvine/cart', {
        method: 'POST',
      });
      
      const cart = await response.json();
      console.log('Cart creation response:', cart);
      setResult(`Cart created: ${JSON.stringify(cart, null, 2)}`);
      
      // Test adding item
      if (cart.id) {
        console.log('Testing add item...');
        const addResponse = await fetch(`/api/crowdvine/cart/${cart.id}/lines/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lines: [{ merchandiseId: 'test-wine-id', quantity: 1 }]
          }),
        });
        
        const addResult = await addResponse.json();
        console.log('Add item response:', addResult);
        setResult(prev => prev + '\n\nAdd item result: ' + JSON.stringify(addResult, null, 2));
      }
    } catch (error) {
      console.error('Test error:', error);
      setResult(`Error: ${error}`);
    }
  };

  const testCartGet = async () => {
    try {
      console.log('Testing cart get...');
      const response = await fetch('/api/crowdvine/cart');
      const cart = await response.json();
      console.log('Cart get response:', cart);
      setResult(`Cart get: ${JSON.stringify(cart, null, 2)}`);
    } catch (error) {
      console.error('Test error:', error);
      setResult(`Error: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Cart Test Page</h1>
      
      <div className="space-y-4 mb-6">
        <Button onClick={testCartCreation}>
          Test Cart Creation + Add Item
        </Button>
        <Button onClick={testCartGet} variant="outline">
          Test Cart Get
        </Button>
      </div>
      
      <div className="p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Result:</h2>
        <pre className="text-sm whitespace-pre-wrap">{result}</pre>
      </div>
      
      <div className="mt-4 p-4 border rounded">
        <h2 className="font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Test Cart Creation + Add Item" to test the full flow</li>
          <li>Check browser console for detailed logs</li>
          <li>Check browser dev tools → Application → Cookies for cartId</li>
        </ol>
      </div>
    </div>
  );
}
