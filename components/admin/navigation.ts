import {
  BarChart3,
  ClipboardList,
  FileText,
  Layers,
  LayoutDashboard,
  Map,
  Package,
  Shield,
  Users,
  Wine,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type AdminNavLink = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
};

export type AdminNavSection = {
  label: string;
  links: AdminNavLink[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    label: "Insights",
    links: [
      { id: "dashboard", label: "Overview", href: "/admin", icon: LayoutDashboard },
      { id: "analytics", label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Catalog",
    links: [
      { id: "producers", label: "Producers", href: "/admin/producers", icon: Wine },
      { id: "wines", label: "Wines", href: "/admin/wines", icon: Wine },
      { id: "wine-boxes", label: "Wine Boxes", href: "/admin/wine-boxes", icon: Layers },
      { id: "content", label: "Content", href: "/admin/content", icon: FileText },
      { id: "images", label: "Images", href: "/admin/images" },
    ],
  },
  {
    label: "Logistics",
    links: [
      { id: "pallets", label: "Pallets", href: "/admin/pallets", icon: Package },
      { id: "bookings", label: "Bookings", href: "/admin/bookings", icon: ClipboardList },
      { id: "reservations", label: "Reservations", href: "/admin/reservations", icon: ClipboardList },
      { id: "zones", label: "Zones", href: "/admin/zones", icon: Map },
    ],
  },
  {
    label: "Access",
    links: [
      { id: "users", label: "Users", href: "/admin/users", icon: Users },
      { id: "memberships", label: "Memberships", href: "/admin/memberships", icon: Users },
      { id: "producer-groups", label: "Producer Groups", href: "/admin/producer-groups" },
      { id: "access-control", label: "Access Control", href: "/admin/access-control", icon: Shield },
    ],
  },
];

