"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
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

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  if (pathname === "/admin") {
    return [
      { label: "CrowdVine", href: "/admin" },
      { label: "Dashboard", href: "/admin" },
    ];
  }
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "CrowdVine", href: "/admin" },
    { label: "Dashboard", href: "/admin" },
  ];
  let href = "/admin";
  for (const seg of segments) {
    href += `/${seg}`;
    const label = seg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    crumbs.push({ label, href });
  }
  return crumbs;
}

export function AdminTopNav({ userEmail, onSignOut }: AdminTopNavProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full">
      <div className="font-medium text-sm hidden sm:flex items-center space-x-1 truncate max-w-[300px]">
        {breadcrumbs.map((item, index) => (
          <div key={item.href + index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mx-1 flex-shrink-0" />
            )}
            {index < breadcrumbs.length - 1 ? (
              <Link
                href={item.href}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100">
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
