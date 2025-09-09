import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Aktivera auth-check igen
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/admin-auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-xl font-bold text-gray-900">
                Crowdvine Admin
              </Link>
            </div>

            <nav className="flex items-center space-x-8">
              <Link href="/admin" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link
                href="/admin/producers"
                className="text-gray-700 hover:text-gray-900"
              >
                Producers
              </Link>
              <Link
                href="/admin/wines"
                className="text-gray-700 hover:text-gray-900"
              >
                Wines
              </Link>
              <Link
                href="/admin/zones"
                className="text-gray-700 hover:text-gray-900"
              >
                Zones
              </Link>
              <Link
                href="/admin/pallets"
                className="text-gray-700 hover:text-gray-900"
              >
                Pallets
              </Link>
              <Link
                href="/admin/bookings"
                className="text-gray-700 hover:text-gray-900"
              >
                Bookings
              </Link>
              <Link
                href="/admin/wine-boxes"
                className="text-gray-700 hover:text-gray-900"
              >
                Wine Boxes
              </Link>
              <Link
                href="/admin/access-control"
                className="text-gray-700 hover:text-gray-900"
              >
                Access Control
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                  redirect("/admin-auth/login");
                }}
              >
                <Button variant="outline" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
