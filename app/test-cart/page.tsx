'use client';

import { useState } from 'react';

export default function TestCartPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const getWineId = async () => {
    setLoading(true);
    try {
      console.log('Getting wine ID...');
      const response = await fetch('/api/crowdvine/products');
      const data = await response.json();
      const wineId = data.products?.[0]?.id;
      console.log('Wine ID:', wineId);
      setResults(prev => ({ ...prev, wineId }));
      return wineId;
    } catch (error) {
      console.error('Error getting wine ID:', error);
      setResults(prev => ({ ...prev, wineIdError: error }));
    } finally {
      setLoading(false);
    }
  };

  const testCartGet = async () => {
    setLoading(true);
    try {
      console.log('Testing cart get...');
      const response = await fetch('/api/crowdvine/cart');
      const data = await response.json();
      console.log('Cart get response:', data);
      setResults(prev => ({ ...prev, cartGet: data }));
    } catch (error) {
      console.error('Error getting cart:', error);
      setResults(prev => ({ ...prev, cartGetError: error }));
    } finally {
      setLoading(false);
    }
  };

  const testCartCreation = async () => {
    setLoading(true);
    try {
      console.log('Testing cart creation...');
      const response = await fetch('/api/crowdvine/cart', { method: 'POST' });
      const data = await response.json();
      console.log('Cart creation response:', data);
      setResults(prev => ({ ...prev, cartCreation: data }));
    } catch (error) {
      console.error('Error creating cart:', error);
      setResults(prev => ({ ...prev, cartCreationError: error }));
    } finally {
      setLoading(false);
    }
  };

  const testAddItem = async (cartId: string, wineId: string) => {
    setLoading(true);
    try {
      console.log('Testing add item...');
      const response = await fetch(`/api/crowdvine/cart/${cartId}/lines/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: [{ merchandiseId: `${wineId}-default`, quantity: 1 }]
        }),
      });
      const data = await response.json();
      console.log('Add item response:', data);
      setResults(prev => ({ ...prev, addItem: data }));
    } catch (error) {
      console.error('Error adding item:', error);
      setResults(prev => ({ ...prev, addItemError: error }));
    } finally {
      setLoading(false);
    }
  };

  const testShopStyleAdd = async () => {
    setLoading(true);
    try {
      console.log('Testing shop-style add...');
      const wineId = await getWineId();
      if (!wineId) return;

      // First get existing cart
      const getResponse = await fetch('/api/crowdvine/cart');
      const existingCart = await getResponse.json();
      console.log('Existing cart:', existingCart);

      let cartId: string;
      let sessionId: string;

      if (existingCart.id && existingCart.session_id) {
        cartId = existingCart.id;
        sessionId = existingCart.session_id;
        console.log('Using existing cart:', { cartId, sessionId });
      } else {
        // Create new cart
        const cartResponse = await fetch('/api/crowdvine/cart', { method: 'POST' });
        const cart = await cartResponse.json();
        cartId = cart.id;
        sessionId = cart.session_id;
        console.log('Created new cart:', { cartId, sessionId });
      }

      // Add item
      const addResponse = await fetch(`/api/crowdvine/cart/${cartId}/lines/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `cartId=${sessionId}`,
        },
        body: JSON.stringify({
          lines: [{ merchandiseId: `${wineId}-default`, quantity: 1 }]
        }),
      });
      const addData = await addResponse.json();
      console.log('Add result:', addData);

      setResults(prev => ({ 
        ...prev, 
        shopStyleTest: {
          cart: existingCart,
          add: addData
        }
      }));
    } catch (error) {
      console.error('Error in shop-style test:', error);
      setResults(prev => ({ ...prev, shopStyleError: error }));
    } finally {
      setLoading(false);
    }
  };

  const testCookieDebug = async () => {
    setLoading(true);
    try {
      console.log('Testing cookie debug...');
      
      // Get cookies before cart creation
      const beforeResponse = await fetch('/api/crowdvine/cart');
      const beforeCart = await beforeResponse.json();
      console.log('Before cart creation:', beforeCart);

      // Create cart
      const cartResponse = await fetch('/api/crowdvine/cart', { method: 'POST' });
      const cart = await cartResponse.json();
      console.log('Cart created:', cart);

      // Get cookies after cart creation
      const afterResponse = await fetch('/api/crowdvine/cart');
      const afterCart = await afterResponse.json();
      console.log('After cart creation:', afterCart);

      setResults(prev => ({ 
        ...prev, 
        cookieDebug: {
          before: beforeCart,
          created: cart,
          after: afterCart
        }
      }));
    } catch (error) {
      console.error('Error in cookie debug:', error);
      setResults(prev => ({ ...prev, cookieDebugError: error }));
    } finally {
      setLoading(false);
    }
  };

  const testServerActionSimulation = async () => {
    setLoading(true);
    try {
      console.log('Testing server action simulation...');
      
      // Simulate the exact flow from server action
      const getResponse = await fetch('/api/crowdvine/cart');
      console.log('GET response status:', getResponse.status);
      console.log('GET response ok:', getResponse.ok);
      
      const existingCart = await getResponse.json();
      console.log('Existing cart data:', existingCart);
      
      let cartId: string;
      let sessionId: string;

      if (existingCart.id && existingCart.session_id) {
        cartId = existingCart.id;
        sessionId = existingCart.session_id;
        console.log('Using existing cart:', { cartId, sessionId });
      } else {
        console.log('Creating new cart because:', {
          hasId: !!existingCart.id,
          hasSessionId: !!existingCart.session_id,
          cartData: existingCart
        });
        
        const cartResponse = await fetch('/api/crowdvine/cart', { method: 'POST' });
        const cart = await cartResponse.json();
        cartId = cart.id;
        sessionId = cart.session_id;
        console.log('Created new cart:', { cartId, sessionId });
      }

      setResults(prev => ({ 
        ...prev, 
        serverActionSimulation: {
          getResponse: { status: getResponse.status, ok: getResponse.ok },
          existingCart,
          decision: existingCart.id && existingCart.session_id ? 'use_existing' : 'create_new',
          finalCart: { cartId, sessionId }
        }
      }));
    } catch (error) {
      console.error('Error in server action simulation:', error);
      setResults(prev => ({ ...prev, serverActionError: error }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cart Test Page</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          onClick={getWineId} 
          disabled={loading}
          className="p-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Get Wine ID
        </button>
        
        <button 
          onClick={testCartGet} 
          disabled={loading}
          className="p-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Test Cart Get
        </button>
        
        <button 
          onClick={testCartCreation} 
          disabled={loading}
          className="p-2 bg-purple-500 text-white rounded disabled:opacity-50"
        >
          Test Cart Creation
        </button>
        
        <button 
          onClick={testShopStyleAdd} 
          disabled={loading}
          className="p-2 bg-orange-500 text-white rounded disabled:opacity-50"
        >
          Test Shop-Style Add
        </button>
        
        <button 
          onClick={testCookieDebug} 
          disabled={loading}
          className="p-2 bg-red-500 text-white rounded disabled:opacity-50"
        >
          Test Cookie Debug
        </button>
        
        <button 
          onClick={testServerActionSimulation} 
          disabled={loading}
          className="p-2 bg-yellow-500 text-white rounded disabled:opacity-50"
        >
          Test Server Action Simulation
        </button>
      </div>

      {loading && <div className="text-center p-4 bg-gray-100 rounded">Loading...</div>}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Results:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    </div>
  );
}
