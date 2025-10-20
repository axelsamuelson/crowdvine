import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { AdminLayoutClient } from "./admin-layout-client";

// Force dynamic rendering for admin layout since it uses cookies
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current authenticated admin using cookie-based auth
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin-auth/login");
  }

  async function handleSignOut() {
    "use server";
    // Clear admin cookie by redirecting to logout
    redirect("/admin-auth/logout");
  }

  return (
    <AdminLayoutClient userEmail={admin.email} onSignOut={handleSignOut}>
      {children}
    </AdminLayoutClient>
  );
}
