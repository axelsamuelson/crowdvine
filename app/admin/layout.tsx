import { redirect } from "next/navigation";
import { signOut } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth";
import { AdminLayoutClient } from "./admin-layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Temporärt inaktivera auth-check för att komma åt admin
  // const user = await getCurrentUser();

  // if (!user || user.role !== "admin") {
  //   redirect("/admin-auth/login");
  // }

  // Mock user för tillfället
  const user = { email: "admin@crowdvine.com", role: "admin" };

  async function handleSignOut() {
    "use server";
    await signOut();
    redirect("/admin-auth/login");
  }

  return (
    <AdminLayoutClient userEmail={user.email} onSignOut={handleSignOut}>
      {children}
    </AdminLayoutClient>
  );
}
