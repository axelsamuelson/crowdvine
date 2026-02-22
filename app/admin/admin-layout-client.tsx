"use client";

import { useState } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        userEmail={userEmail} 
        onSignOut={onSignOut}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content - min-h-0 so flex child can shrink and main gets bounded height for scroll */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold text-gray-900">CrowdVine Admin</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <div className="max-w-7xl mx-auto min-h-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
