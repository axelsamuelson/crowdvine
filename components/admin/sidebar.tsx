"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
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
  ChevronDown,
  TrendingUp,
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
      { name: "Wine Boxes", href: "/admin/wine-boxes", icon: Gift },
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
];

export function Sidebar({ userEmail, onSignOut, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const isItemActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href + "/"));

  const groupHasActiveItem = (group: NavGroup) =>
    group.items.some(isItemActive);

  const SidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Link href="/admin" onClick={onMobileClose} className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-bold text-gray-900">CrowdVine</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigationGroups.map((group) => {
            const isGroupOpen = groupHasActiveItem(group);
            return (
              <Collapsible
                key={group.name}
                defaultOpen={isGroupOpen}
                className="group/collapsible"
              >
                <CollapsibleTrigger
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <div className="flex items-center">
                    <group.icon className="mr-3 h-5 w-5 shrink-0" />
                    {group.name}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-gray-200 pl-3">
                    {group.items.map((item) => {
                      const isActive = isItemActive(item);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={onMobileClose}
                          className={cn(
                            "flex items-center py-2 text-sm rounded-md transition-colors pl-3",
                            isActive
                              ? "text-gray-900 font-medium bg-gray-100"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                          )}
                        >
                          <item.icon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {userEmail.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userEmail}
            </p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onSignOut}
          className="w-full justify-start"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-full w-64 flex-col bg-white border-r border-gray-200">
        {SidebarContent}
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex h-full flex-col bg-white">
            {SidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
