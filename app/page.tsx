export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Crowdvine
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Wine marketplace
        </p>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Cloudflare Pages Preview</h2>
          <p className="text-gray-600">
            This is a minimal version for Cloudflare Pages testing.
          </p>
        </div>
      </div>
    </div>
  );
}