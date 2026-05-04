/**
 * DB-aligned types for `market_drops` (Phase 1).
 * No generated Supabase schema in repo — update here when the table changes.
 */

export type MarketDropCheckoutMode =
  | "disabled"
  | "interest_only"
  | "conditional_reservation"
  | "normal_checkout";

export type MarketDropStatus =
  | "draft"
  | "active"
  | "conditional"
  | "paused"
  | "closed";

export type MarketDropChargePolicy =
  | "automatic_allowed"
  | "admin_approved_required"
  | "disabled";

/** Row shape for `market_drops` (snake_case columns). */
export type MarketDropRow = {
  id: string;
  source_pallet_id: string;
  geo_zone_id?: string | null;
  market_code: string;
  country_code: string;
  region_code: string | null;
  display_name: string;
  display_destination: string;
  checkout_mode: MarketDropCheckoutMode;
  currency_code: string;
  status: MarketDropStatus;
  charge_policy: MarketDropChargePolicy;
  capacity_bottles: number | null;
  reserved_bottles: number;
  conditional_bottles: number;
  terms_version: string | null;
  logistics_status: string | null;
  legal_status: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
