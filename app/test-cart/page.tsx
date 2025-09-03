import { addWine1Action, addWine2Action } from './actions';

export default function TestCartPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Test Cart Functionality</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Add Wine to Cart</h2>
          <form action={addWine1Action}>
            <button 
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add Extralucide 2023 to Cart
            </button>
          </form>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Add Another Wine</h2>
          <form action={addWine2Action}>
            <button 
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add Leno Dolce Sole 2022 to Cart
            </button>
          </form>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">View Cart</h2>
          <a 
            href="/api/crowdvine/cart"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 inline-block"
            target="_blank"
          >
            View Cart API
          </a>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Go to Checkout</h2>
          <a 
            href="/checkout"
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 inline-block"
          >
            Go to Checkout
          </a>
        </div>
      </div>
    </div>
  );
}
