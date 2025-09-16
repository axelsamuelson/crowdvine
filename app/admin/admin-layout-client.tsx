"use client";

import { Sidebar } from "@/components/admin/sidebar";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  userEmail: string;
  onSignOut: () => void;
}

export function AdminLayoutClient({
  children,
  userEmail,
  onSignOut,
}: AdminLayoutClientProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userEmail={userEmail} onSignOut={onSignOut} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
