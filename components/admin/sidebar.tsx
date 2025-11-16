"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { adminNavSections } from "@/components/admin/navigation";
import { useAdminLayout } from "@/components/admin/layout-context";

interface SidebarProps {
  userEmail: string;
  onSignOut: () => void;
}

export function Sidebar({ userEmail, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const { navBadges } = useAdminLayout();
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    if (!query) return adminNavSections;
    return adminNavSections
      .map((section) => ({
        ...section,
        links: section.links.filter((link) =>
          link.label.toLowerCase().includes(query.toLowerCase()),
        ),
      }))
      .filter((section) => section.links.length > 0);
  }, [query]);

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center px-5">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-semibold">
            CV
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">CrowdVine</p>
            <p className="text-xs text-slate-400">Admin Suite</p>
          </div>
        </Link>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Quick search"
            className="h-9 border-slate-200 pl-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 pb-6">
        <nav className="space-y-6">
          {filteredSections.map((section) => (
            <div key={section.label} className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.links.map((link) => {
                  const isActive = pathname === link.href;
                  const badgeCount = navBadges[link.id];
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      {link.icon && (
                        <link.icon
                          className={cn(
                            "h-4 w-4",
                            isActive ? "text-white" : "text-slate-400",
                          )}
                        />
                      )}
                      <span className="flex-1 truncate">{link.label}</span>
                      {badgeCount !== undefined && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-700",
                          )}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredSections.length === 0 && (
            <p className="px-3 text-xs text-slate-400">No matches</p>
          )}
        </nav>
      </ScrollArea>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {userEmail}
            </p>
            <p className="text-xs text-slate-400">Administrator</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="w-full justify-start gap-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
