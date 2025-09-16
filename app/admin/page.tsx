import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";

export default function AdminPage() {
  return (
    <PageLayout>
      <div className="min-h-[90vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">Admin Panel</h1>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Welcome to Pact Wines Admin
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Access the admin panel to manage wines, orders, and users.
            </p>
            
            <div className="space-y-4">
              <Link 
                href="/admin-auth/login" 
                className="inline-block w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Admin Login
              </Link>
              
              <div className="text-sm text-muted-foreground">
                <p>Admin access is currently open for development.</p>
                <p>Use the login link above to access admin features.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
