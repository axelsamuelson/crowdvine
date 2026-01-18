import { HomeSidebar } from "@/components/layout/sidebar/home-sidebar";
import { Footer } from "@/components/layout/footer";
import { getCollections } from "@/lib/shopify";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { Concept12Visualization } from "@/components/home-concepts/concept-12-visualization";

// Disable static generation for now - make it dynamic
export const dynamic = "force-dynamic";

export default async function Concept12Page() {
  // Check if user is admin
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin-auth/login");
  }

  let collections = [];
  try {
    collections = await getCollections();
  } catch (error) {
    console.warn("Failed to fetch collections in home page:", error);
    collections = [];
  }

  return (
    <>
      <main>
        <div className="contents md:grid md:grid-cols-12 md:gap-1">
          <HomeSidebar collections={collections} />
          <div className="flex relative flex-col grid-cols-2 col-span-8 w-full md:grid">
            {/* Concept 12 Visualization */}
            <div className="col-span-2 min-h-[600px] mb-8">
              <Concept12Visualization />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

