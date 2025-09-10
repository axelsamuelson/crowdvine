import { redirect } from "next/navigation";
import { signOut } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth";
import { AdminLayoutClient } from "./admin-layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current authenticated user
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin-auth/login");
  }

  // Get user profile to check role
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const supabase = getSupabaseAdmin();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/admin-auth/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut();
    redirect("/admin-auth/login");
  }

  return (
    <AdminLayoutClient userEmail={profile.email || user.email || "Unknown"} onSignOut={handleSignOut}>
      {children}
    </AdminLayoutClient>
  );
}
