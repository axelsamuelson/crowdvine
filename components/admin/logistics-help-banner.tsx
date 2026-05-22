import Link from "next/link";
import { ArrowRight, Globe2, MapPin, Package, Truck } from "lucide-react";

const layers = [
  {
    href: "/admin/geo-zones",
    icon: Globe2,
    title: "Vinzoner & leverans",
    body: "En adminvy: kundens land/stad och kopplad leveranszon (samma namn).",
  },
  {
    href: "/admin/shipping-regions",
    icon: Truck,
    title: "Fraktregioner",
    body: "Producentgrupper — primär routing när alla i varukorgen delar region.",
  },
  {
    href: "/admin/zones",
    icon: MapPin,
    title: "Upphämtningszoner",
    body: "Endast vingård/upphämtning. Leverans hanteras under Vinzoner & leverans.",
  },
  {
    href: "/admin/pallets",
    icon: Package,
    title: "Pallar",
    body: "Kapacitet och reservationer.",
  },
] as const;

export function LogisticsHelpBanner() {
  return (
    <div className="rounded-xl border border-blue-200/80 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
      <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
        Lager & frakt — fyra ställen
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {layers.map((layer) => (
          <li key={layer.href}>
            <Link
              href={layer.href}
              className="group flex items-start gap-2 rounded-lg border border-transparent bg-white/60 px-3 py-2 text-left transition-colors hover:border-blue-200 hover:bg-white dark:bg-zinc-900/40 dark:hover:border-blue-800/50 dark:hover:bg-zinc-900/70"
            >
              <layer.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                  {layer.title}
                  <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-gray-600 dark:text-zinc-400">
                  {layer.body}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
