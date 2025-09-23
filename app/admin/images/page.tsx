import { getWines } from "@/lib/actions/wines";
import { getWineImages } from "@/lib/actions/wine-images";
import ImageHealthDashboard from "@/components/admin/image-health-dashboard";

export default async function ImagesPage() {
  const wines = await getWines();
  const allWineImages = [];

  // Get images for all wines
  for (const wine of wines) {
    try {
      const images = await getWineImages(wine.id);
      allWineImages.push(...images.map(img => ({ ...img, wine_name: wine.wine_name })));
    } catch (error) {
      console.error(`Failed to load images for wine ${wine.id}:`, error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Image Management</h1>
        <p className="text-gray-600">Monitor and manage wine product images</p>
      </div>

      <ImageHealthDashboard 
        wines={wines}
        wineImages={allWineImages}
      />
    </div>
  );
}
