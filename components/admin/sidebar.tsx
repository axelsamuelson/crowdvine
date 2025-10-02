"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  LogOut,
} from "lucide-react";

interface SidebarProps {
  userEmail: string;
  onSignOut: () => void;
}

const navigation = [
  {
     name: "Dashboard",
     href: "/admin",
     icon: LayoutDashboard,
   },
   {
     name: "Users",
     href: "/admin/users",
     icon: Users,
   },
   {
     name: "Producers",
     href: "/admin/producers",
     icon: Wine,
   },
   {
     name: "Wines",
     href: "/admin/wines",
     icon: Wine,
   },
   {
     name: "Zones",
     href: "/admin/zones",
     icon: MapPin,
   },
   {
     name: "Pallets",
     href: "/admin/pallets",
     icon: Package,
   },
   {
     name: "Bookings",
     href: "/admin/bookings",
     icon: Calendar,
   },
   {
     name: "Reservations",
     href: "/admin/reservations",
     icon: FileText,
   },
   {
     name: "Wine Boxes",
     href: "/admin/wine-boxes",
     icon: Gift,
   },
   {
     name: "Access Control",
     href: "/admin/access-control",
     icon: Shield,
   },
 ];

export function Sidebar({ userEmail, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Link href="/admin" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-xl font-bold text-gray-900">CrowdVine</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
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
    </div>
  );
}
