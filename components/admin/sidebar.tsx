"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Wine,
  MapPin,
  Package,
  Calendar,
  FileText,
  Gift,
  Shield,
  Award,
  LogOut,
  BarChart3,
  TrendingUp,
  Building2,
  Sparkles,
  ListTodo,
  FolderKanban,
  Target,
  UserCheck,
  Waypoints,
  Flag,
  Globe2,
} from "lucide-react";

interface SidebarProps {
  userEmail: string;
  onSignOut: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    name: "Översikt",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    name: "Användare",
    icon: Users,
    items: [
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Business", href: "/admin/users/business", icon: Building2 },
      { name: "Memberships", href: "/admin/memberships", icon: Award },
      { name: "Access Control", href: "/admin/access-control", icon: Shield },
    ],
  },
  {
    name: "Viner & Produkter",
    icon: Wine,
    items: [
      { name: "Producers", href: "/admin/producers", icon: Wine },
      { name: "Wines", href: "/admin/wines", icon: Wine },
      { name: "Wine Tastings", href: "/admin/wine-tastings", icon: Wine },
      { name: "Competitor prices", href: "/admin/price-sources", icon: TrendingUp },
    ],
  },
  {
    name: "Lager & Frakt",
    icon: Package,
    items: [
      { name: "Pallets", href: "/admin/pallets", icon: Package },
      { name: "Zones", href: "/admin/zones", icon: MapPin },
      { name: "Shipping regions", href: "/admin/shipping-regions", icon: Globe2 },
    ],
  },
  {
    name: "Bokningar",
    icon: Calendar,
    items: [
      { name: "Bookings", href: "/admin/bookings", icon: Calendar },
      { name: "Reservations", href: "/admin/reservations", icon: FileText },
    ],
  },
  {
    name: "Operations",
    icon: ListTodo,
    items: [
      { name: "Goals", href: "/admin/operations/goals", icon: Flag },
      { name: "Objectives", href: "/admin/operations/objectives", icon: Target },
      { name: "Projects", href: "/admin/operations/projects", icon: FolderKanban },
      { name: "Tasks", href: "/admin/operations/tasks", icon: ListTodo },
      { name: "Strategy map", href: "/admin/strategy-map", icon: Waypoints },
      { name: "My Work", href: "/admin/operations/my-work", icon: UserCheck },
    ],
  },
  {
    name: "AI & Menyer",
    icon: Sparkles,
    items: [
      { name: "Menyextraktion", href: "/admin/menu-extraction", icon: Sparkles },
    ],
  },
];

export function Sidebar({ userEmail, onSignOut, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const isItemActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href + "/"));

  const SidebarContent = (
    <>
      {/* Logo – template style */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-[#1F1F23]">
        <Link
          href="/admin"
          onClick={onMobileClose}
          className="flex items-center gap-3"
        >
          <div className="h-8 w-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white dark:text-gray-900 font-bold text-sm">
              C
            </span>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            CrowdVine
          </span>
        </Link>
      </div>

      {/* Navigation – template: section labels + flat nav items */}
      <ScrollArea className="flex-1 py-4 px-4">
        <nav className="space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.name}>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {group.name}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isItemActive(item);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                        isActive
                          ? "text-gray-900 dark:text-white font-medium bg-gray-100 dark:bg-[#1F1F23]"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]",
                      )}
                    >
                      <item.icon className="mr-3 h-4 w-4 shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User section – template footer style */}
      <div className="border-t border-gray-200 dark:border-[#1F1F23] px-4 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 truncate">
            <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-[#1F1F23] flex items-center justify-center flex-shrink-0">
              <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                {userEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="truncate">{userEmail}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex h-full w-64 flex-col flex-shrink-0 bg-white dark:bg-[#0F0F12] border-r border-gray-200 dark:border-[#1F1F23]">
        {SidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-white dark:bg-[#0F0F12] border-r border-gray-200 dark:border-[#1F1F23]"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex h-full flex-col">{SidebarContent}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
