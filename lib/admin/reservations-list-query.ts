/**
 * Admin reservations list select with optional fulfillment columns.
 * Tries migration-277 fields first; falls back when schema is unready
 * so default-OFF / unmigrated prod listing stays healthy.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaColumnError } from "@/lib/commerce/direct-box-reservation-persistence";

export const ADMIN_RESERVATIONS_LIST_SELECT_BASE = `
        id,
        status,
        payment_status,
        payment_mode,
        payment_method_type,
        payment_method_brand,
        payment_method_last4,
        created_at,
        user_id,
        delivery_zone_id,
        pickup_zone_id,
        checkout_group_id,
        shipping_region_id,
        cart_id,
        address_id,
        pallet_id,
        market_code,
        country_code,
        region,
        is_conditional,
        charge_blocked_reason,
        archived_at,
        archive_reason,
        status_before_archive,
        delivery:pallet_zones!delivery_zone_id (
          id,
          name
        ),
        shipping_region:shipping_regions!shipping_region_id (
          id,
          name
        ),
        pallet:pallets!pallet_id (
          id,
          name
        )
`;

export const ADMIN_RESERVATIONS_LIST_SELECT_WITH_FULFILLMENT = `
        id,
        status,
        payment_status,
        payment_mode,
        payment_method_type,
        payment_method_brand,
        payment_method_last4,
        created_at,
        user_id,
        delivery_zone_id,
        pickup_zone_id,
        checkout_group_id,
        shipping_region_id,
        cart_id,
        address_id,
        pallet_id,
        market_code,
        country_code,
        region,
        is_conditional,
        charge_blocked_reason,
        fulfillment_channel,
        fulfillment_dispatch_status,
        archived_at,
        archive_reason,
        status_before_archive,
        delivery:pallet_zones!delivery_zone_id (
          id,
          name
        ),
        shipping_region:shipping_regions!shipping_region_id (
          id,
          name
        ),
        pallet:pallets!pallet_id (
          id,
          name
        )
`;

export type AdminReservationsArchiveFilter = "active" | "archived" | "all";

function applyArchiveFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  archiveFilter: AdminReservationsArchiveFilter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (archiveFilter === "archived") {
    return query.eq("status", "archived");
  }
  if (archiveFilter === "active") {
    return query.neq("status", "archived").is("archived_at", null);
  }
  return query;
}

/**
 * Fetch admin reservation rows; prefer fulfillment columns, fall back on missing schema.
 */
export async function fetchAdminReservationsList(
  sbAdmin: SupabaseClient,
  archiveFilter: AdminReservationsArchiveFilter,
): Promise<{
  reservations: Array<Record<string, unknown>>;
  error: { message: string; code?: string } | null;
  fulfillmentColumnsAvailable: boolean;
}> {
  const run = async (selectCols: string) => {
    let query = sbAdmin
      .from("order_reservations")
      .select(selectCols)
      .order("created_at", { ascending: false })
      .limit(200);
    query = applyArchiveFilter(query as never, archiveFilter) as typeof query;
    return query;
  };

  const extended = await run(ADMIN_RESERVATIONS_LIST_SELECT_WITH_FULFILLMENT);
  if (!extended.error) {
    return {
      reservations: Array.isArray(extended.data) ? extended.data : [],
      error: null,
      fulfillmentColumnsAvailable: true,
    };
  }

  const missingFulfillment =
    isMissingSchemaColumnError(extended.error, "fulfillment_channel") ||
    isMissingSchemaColumnError(extended.error, "fulfillment_dispatch_status");

  if (!missingFulfillment) {
    return {
      reservations: [],
      error: {
        message: extended.error.message,
        code: (extended.error as { code?: string }).code,
      },
      fulfillmentColumnsAvailable: false,
    };
  }

  const base = await run(ADMIN_RESERVATIONS_LIST_SELECT_BASE);
  if (base.error) {
    return {
      reservations: [],
      error: {
        message: base.error.message,
        code: (base.error as { code?: string }).code,
      },
      fulfillmentColumnsAvailable: false,
    };
  }
  return {
    reservations: Array.isArray(base.data) ? base.data : [],
    error: null,
    fulfillmentColumnsAvailable: false,
  };
}

export type { AdminFulfillmentBadge } from "@/lib/admin/fulfillment-display";
export { resolveAdminFulfillmentDisplay } from "@/lib/admin/fulfillment-display";
