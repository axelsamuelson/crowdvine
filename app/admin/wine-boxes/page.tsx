import { Metadata } from "next";
import { WineBoxesList } from "./components/wine-boxes-list";
import { CreateWineBoxButton } from "./components/create-wine-box-button";

export const metadata: Metadata = {
  title: "Wine Boxes Admin | Crowdvine",
  description: "Manage wine boxes and curated packages",
};

export default async function WineBoxesAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wine Boxes</h1>
          <p className="text-gray-600">Manage curated wine packages</p>
        </div>
        <CreateWineBoxButton />
      </div>

      <WineBoxesList />
    </div>
  );
}
