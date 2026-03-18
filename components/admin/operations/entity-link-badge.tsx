import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import type { EntityLink, EntityType } from "@/lib/types/operations"

interface Props {
  link: EntityLink
}

const ENTITY_LABELS: Record<EntityType, string> = {
  producer: "Producer",
  wine: "Wine",
  wine_box: "Wine Box",
  booking: "Booking",
  reservation: "Reservation",
  pallet: "Pallet",
  zone: "Zone",
  menu_document: "Menu",
  extraction_job: "Extraction",
  user: "User",
  business: "Business",
}

const ENTITY_ROUTES: Record<EntityType, string> = {
  producer: "/admin/producers",
  wine: "/admin/wines",
  wine_box: "/admin/wine-boxes",
  booking: "/admin/bookings",
  reservation: "/admin/reservations",
  pallet: "/admin/pallets",
  zone: "/admin/zones",
  menu_document: "/admin/menu-extraction",
  extraction_job: "/admin/menu-extraction",
  user: "/admin/users",
  business: "/admin/users/business",
}

export function EntityLinkBadge({ link }: Props) {
  const typeLabel =
    ENTITY_LABELS[link.entity_type as EntityType] ?? link.entity_type
  const baseRoute = ENTITY_ROUTES[link.entity_type as EntityType]
  const href = baseRoute ? `${baseRoute}/${link.entity_id}` : null
  const displayLabel =
    link.label ?? `${typeLabel}: ${link.entity_id.slice(0, 8)}`

  const content = (
    <Badge
      variant="outline"
      className="border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:bg-purple-950/50 gap-1 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950"
    >
      <span className="text-purple-400 dark:text-purple-600 text-[10px] uppercase tracking-wide">
        {typeLabel}
      </span>
      <span>{displayLabel}</span>
      {href && <ExternalLink className="h-3 w-3 opacity-50" />}
    </Badge>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
