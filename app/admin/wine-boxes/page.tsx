import { Metadata } from "next";
import { WineBoxesList } from "./components/wine-boxes-list";
import { CreateWineBoxButton } from "./components/create-wine-box-button";

export const metadata: Metadata = {
  title: "Wine Boxes Admin | Crowdvine",
  description: "Manage wine boxes and curated packages",
};

export default async function WineBoxesAdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="base-grid py-sides">
        <div className="col-span-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
                Wine Boxes
              </h1>
              <p className="text-lg text-muted-foreground">
                Manage curated wine packages and collections
              </p>
            </div>
            <CreateWineBoxButton />
          </div>

          <WineBoxesList />
        </div>
      </div>
    </div>
  );
}
