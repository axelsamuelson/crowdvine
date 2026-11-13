import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Wine,
  MapPin,
  Package,
  Truck,
  Calendar,
  FileText,
  Gift,
  Shield,
  Award,
  BarChart3,
  TrendingUp,
  Building2,
  Sparkles,
  Search,
  ListTodo,
  FolderKanban,
  Target,
  UserCheck,
  Flag,
  Globe2,
  Mail,
  Wrench,
  Image,
  PenSquare,
  Wallet,
} from "lucide-react";

export interface AdminNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  name: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

/** Top-level links (not nested under a folder group). */
export const adminTopLevelNav: AdminNavItem[] = [
  { name: "Översikt", href: "/admin", icon: LayoutDashboard },
  { name: "Analys", href: "/admin/analytics", icon: BarChart3 },
];

/**
 * Admin sidebar groups (desktop + mobile sheet).
 * Pages may still exist without a menu entry (ops approval 648d5e92 / f297c243 step 1).
 * Labels are Swedish (Drift group = former Operations).
 */
export const adminNavigationGroups: AdminNavGroup[] = [
  {
    name: "Finans",
    icon: Wallet,
    items: [
      { name: "Utfall", href: "/admin/finance/utfall", icon: Wallet },
      {
        name: "Prisscenarier",
        href: "/admin/finance/prisscenarier",
        icon: TrendingUp,
      },
      {
        name: "Fulfillment-kostnader",
        href: "/admin/finance/fulfillment-costs",
        icon: Truck,
      },
    ],
  },
  {
    name: "Användare",
    icon: Users,
    items: [
      { name: "Användare", href: "/admin/users", icon: Users },
      {
        name: "Företagskonton",
        href: "/admin/users/business",
        icon: Building2,
      },
      { name: "Medlemskap", href: "/admin/memberships", icon: Award },
      { name: "Åtkomstkontroll", href: "/admin/access-control", icon: Shield },
    ],
  },
  {
    name: "Viner & Produkter",
    icon: Wine,
    items: [
      { name: "Producenter", href: "/admin/producers", icon: Wine },
      { name: "Viner", href: "/admin/wines", icon: Wine },
      { name: "Vinprovningar", href: "/admin/wine-tastings", icon: Wine },
      {
        name: "Konkurrentpriser",
        href: "/admin/price-sources",
        icon: TrendingUp,
      },
    ],
  },
  {
    name: "Lager & Frakt",
    icon: Package,
    items: [
      { name: "Vinzoner & leverans", href: "/admin/geo-zones", icon: Globe2 },
      { name: "Fraktregioner", href: "/admin/shipping-regions", icon: Truck },
      { name: "Fraktalternativ", href: "/admin/freight", icon: Truck },
      { name: "Upphämtningszoner", href: "/admin/zones", icon: MapPin },
      { name: "Pallar", href: "/admin/pallets", icon: Package },
      {
        name: "Pall-inställningar",
        href: "/admin/pallets/settings",
        icon: Wrench,
      },
    ],
  },
  {
    name: "Bokningar",
    icon: Calendar,
    items: [
      { name: "B2C-ordrar", href: "/admin/b2c-orders", icon: Calendar },
      { name: "B2B-ordrar", href: "/admin/b2b-orders", icon: FileText },
      {
        name: "B2B-förfrågningar",
        href: "/admin/b2b-inquiries",
        icon: FileText,
      },
      { name: "Rabattkoder", href: "/admin/rabattkoder", icon: Gift },
      {
        name: "Exkluderade profiler",
        href: "/admin/exkluderade-profiler",
        icon: Shield,
      },
    ],
  },
  {
    name: "Drift",
    icon: ListTodo,
    items: [
      { name: "Mål", href: "/admin/operations/goals", icon: Flag },
      {
        name: "Delmål",
        href: "/admin/operations/objectives",
        icon: Target,
      },
      { name: "Projekt", href: "/admin/operations/projects", icon: FolderKanban },
      { name: "Uppgifter", href: "/admin/operations/tasks", icon: ListTodo },
      { name: "Min arbetsyta", href: "/admin/operations/my-work", icon: UserCheck },
    ],
  },
  {
    name: "CMS",
    icon: PenSquare,
    items: [
      { name: "Sajtinnehåll", href: "/admin/content", icon: FileText },
      { name: "Producentlådor", href: "/admin/producer-boxes", icon: Wine },
      { name: "Systembolaget", href: "/admin/systembolaget", icon: Wine },
      { name: "Bilder", href: "/admin/images", icon: Image },
    ],
  },
  {
    name: "AI & Menyer",
    icon: Sparkles,
    items: [
      { name: "Menyextraktion", href: "/admin/menu-extraction", icon: Sparkles },
      { name: "Hitta vin", href: "/admin/wine-search", icon: Search },
    ],
  },
  {
    name: "Verktyg",
    icon: Wrench,
    items: [
      { name: "E-post", href: "/admin/email", icon: Mail },
      {
        name: "Domain authority",
        href: "/admin/seo/domain-authority",
        icon: TrendingUp,
      },
    ],
  },
];

/** Flat list of every sidebar link (top-level + group items). */
export function getAdminNavItems(): AdminNavItem[] {
  return [
    ...adminTopLevelNav,
    ...adminNavigationGroups.flatMap((g) => g.items),
  ];
}
