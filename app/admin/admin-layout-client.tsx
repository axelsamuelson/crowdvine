"use client";

import { useState } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { AdminTopNav } from "@/components/admin/admin-top-nav";
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
    <div className="flex h-screen bg-white dark:bg-[#0F0F12]">
      <Sidebar
        userEmail={userEmail}
        onSignOut={onSignOut}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="w-full flex-1 flex flex-col min-w-0">
        <header className="h-16 flex-shrink-0 border-b border-gray-200 dark:border-[#1F1F23] flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-2"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Button>
          <div className="flex-1 min-w-0">
            <AdminTopNav userEmail={userEmail} onSignOut={onSignOut} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 bg-white dark:bg-[#0F0F12]">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
