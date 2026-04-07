"use client";

import Link from "next/link";
import { useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { AdminBreadcrumbDetailContext } from "@/components/admin/admin-breadcrumb-detail-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AdminTopNavProps {
  userEmail: string;
  onSignOut: () => void;
}

/** Tydliga etiketter för vanliga admin-segment (UUID:er m.m. lämnas som korta stubbar). */
const SEGMENT_LABELS: Record<string, string> = {
  operations: "Operations",
  projects: "Projects",
  tasks: "Tasks",
  objectives: "Objectives",
  goals: "Goals",
  "my-work": "My work",
  "strategy-map": "Strategy map",
  "menu-extraction": "Menu extraction",
};

function looksLikeUuid(seg: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    seg
  );
}

function inferResourceLabelForIdSegment(
  prevSegment: string | undefined,
  seg: string
): string | null {
  if (!prevSegment || !looksLikeUuid(seg)) return null;
  switch (prevSegment) {
    case "tasks":
      return "Task";
    case "projects":
      return "Project";
    case "objectives":
      return "Objective";
    case "goals":
      return "Goal";
    default:
      return null;
  }
}

function titleizeSegment(seg: string): string {
  return seg
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

function getBreadcrumbs(
  pathname: string,
  detailOverride: { path: string; title: string } | null
): { label: string; href: string }[] {
  const norm = normalizePath(pathname);
  /** Endast på själva dashboard-root ska "Dashboard" visas. */
  if (norm === "/admin") {
    return [
      { label: "CrowdVine", href: "/admin" },
      { label: "Dashboard", href: "/admin" },
    ];
  }

  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "CrowdVine", href: "/admin" },
  ];
  let href = "/admin";
  let prev: string | undefined;
  for (const seg of segments) {
    href += `/${seg}`;
    const mapped = SEGMENT_LABELS[seg];
    const inferred = inferResourceLabelForIdSegment(prev, seg);
    const label =
      mapped ?? inferred ?? titleizeSegment(seg);
    crumbs.push({ label, href });
    prev = seg;
  }

  if (
    detailOverride &&
    crumbs.length > 0 &&
    normalizePath(detailOverride.path) === norm
  ) {
    const last = crumbs[crumbs.length - 1];
    crumbs[crumbs.length - 1] = {
      ...last,
      label: detailOverride.title,
    };
  }

  return crumbs;
}

export function AdminTopNav({ userEmail, onSignOut }: AdminTopNavProps) {
  const pathname = usePathname();
  const detailCtx = useContext(AdminBreadcrumbDetailContext);
  const breadcrumbs = useMemo(
    () => getBreadcrumbs(pathname, detailCtx?.detail ?? null),
    [pathname, detailCtx?.detail]
  );

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full">
      <div className="font-medium text-sm hidden min-w-0 flex-1 sm:flex sm:flex-wrap sm:items-center sm:gap-x-1 sm:pr-4">
        {breadcrumbs.map((item, index) => (
          <div key={item.href + index} className="flex min-w-0 items-center">
            {index > 0 && (
              <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
            )}
            {index < breadcrumbs.length - 1 ? (
              <Link
                href={item.href}
                className="shrink-0 text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                {item.label}
              </Link>
            ) : (
              <span className="min-w-0 break-words text-gray-900 dark:text-gray-100">
                {item.label}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="focus:outline-none flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-[#1F1F23] flex items-center justify-center ring-2 ring-gray-200 dark:ring-[#2B2B30]">
                <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-72 bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-lg shadow-lg"
          >
            <div className="p-3 border-b border-gray-100 dark:border-[#1F1F23]">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {userEmail}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
            </div>
            <div className="p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 dark:text-gray-300"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
