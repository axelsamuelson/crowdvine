"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Sidebar } from "@/components/admin/sidebar";
import {
  AdminLayoutProvider,
  useAdminLayout,
} from "@/components/admin/layout-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  userEmail: string;
  onSignOut: () => void;
}

function AdminTopBar() {
  const { header } = useAdminLayout();
  const breadcrumbs = header.breadcrumbs ?? [];
  const badges = header.badges ?? [];
  const actions = header.actions ?? [];

  const badgeToneClass: Record<string, string> = {
    neutral: "bg-slate-200 text-slate-900",
    success: "bg-emerald-100 text-emerald-900",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-rose-100 text-rose-900",
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4">
        {breadcrumbs.length > 0 && (
          <nav className="flex flex-wrap items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${index}`} className="flex items-center">
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-slate-900">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="mx-2 h-3 w-3 text-slate-400" />
                )}
              </div>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px]">
            <h1 className="text-2xl font-semibold text-slate-900">
              {header.title}
            </h1>
            {header.description && (
              <p className="text-sm text-slate-500">{header.description}</p>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {badges.map((badge) => (
              <Badge
                key={badge.label}
                className={badgeToneClass[badge.tone ?? "neutral"]}
              >
                {badge.label}
              </Badge>
            ))}
            {actions.map((action) =>
              action.href ? (
                <Button
                  key={action.id}
                  size="sm"
                  variant="default"
                  asChild
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ) : (
                <Button
                  key={action.id}
                  size="sm"
                  variant="outline"
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ),
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function AdminLayoutClient({
  children,
  userEmail,
  onSignOut,
}: AdminLayoutClientProps) {
  return (
    <AdminLayoutProvider>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar userEmail={userEmail} onSignOut={onSignOut} />
        <div className="flex flex-1 flex-col">
          <AdminTopBar />
          <main className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-7xl space-y-8">{children}</div>
          </main>
        </div>
      </div>
    </AdminLayoutProvider>
  );
}
