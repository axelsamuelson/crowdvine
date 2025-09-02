// Test page to verify cart functionality
export default function TestCartPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Cart Test Page</h1>
      <p className="mb-4">This page is for testing cart functionality.</p>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Instructions:</h2>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Go to <a href="/shop" className="text-blue-600 underline">/shop</a></li>
            <li>Add a wine to cart</li>
            <li>Check if it stays in cart after refresh</li>
            <li>Check browser console for any errors</li>
          </ol>
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="font-semibold">Debug Info:</h2>
          <p className="text-sm text-gray-600">
            Check browser developer tools → Application → Cookies to see cart cookies
          </p>
        </div>
      </div>
    </div>
  );
}
