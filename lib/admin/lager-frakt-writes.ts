import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  geoZoneCityRequired,
  syncDeliveryZoneForGeoZone,
} from "@/lib/market/sync-geo-zone-delivery";
import { resolveDisplayCurrencyCode } from "@/lib/shopping-context/currency-policy";
import { syncPalletShipReadiness } from "@/lib/pallet-completion";
import { selectPalletFreightQuote } from "@/lib/pallet-freight-quotes";
import { NON_ACTIVE_RESERVATION_STATUSES_POSTGREST } from "@/lib/reservations/archive";

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n == null ? null : Math.round(n);
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

// ── Geo zones ────────────────────────────────────────────────

export type CreateGeoZoneInput = {
  market_code: string;
  country_code: string;
  name: string;
  display_name: string;
  zone_type: string;
  eligibility_status: string;
  region_code?: string | null;
  city?: string | null;
  currency_code?: string | null;
  terms_version?: string | null;
  requires_admin_approval?: boolean;
  is_active?: boolean;
  sort_order?: number;
  metadata?: Record<string, unknown>;
};

export async function createGeoZone(
  sb: SupabaseClient,
  input: CreateGeoZoneInput,
): Promise<{ id: string }> {
  const market_code = input.market_code?.trim() ?? "";
  const country_code = (input.country_code ?? "").trim().toUpperCase();
  const name = input.name?.trim() ?? "";
  const display_name = input.display_name?.trim() ?? "";
  const zone_type = input.zone_type?.trim() ?? "";
  const eligibility_status = input.eligibility_status?.trim() ?? "";
  if (
    !market_code ||
    country_code.length !== 2 ||
    !name ||
    !display_name ||
    !zone_type ||
    !eligibility_status
  ) {
    throw new Error(
      "market_code, country_code (ISO-2), name, display_name, zone_type, eligibility_status are required",
    );
  }
  const city =
    typeof input.city === "string" && input.city.trim()
      ? input.city.trim()
      : null;
  const cityErr = geoZoneCityRequired(city);
  if (cityErr) throw new Error(cityErr);

  let currency_code =
    typeof input.currency_code === "string" && input.currency_code.trim()
      ? input.currency_code.trim().toUpperCase()
      : null;
  if (!currency_code) {
    currency_code = resolveDisplayCurrencyCode({
      marketCode: market_code,
      countryCode: country_code,
    });
  }

  const is_active = input.is_active !== false;
  const { data, error } = await sb
    .from("geo_zones")
    .insert({
      market_code,
      country_code,
      region_code:
        typeof input.region_code === "string" && input.region_code.trim()
          ? input.region_code.trim().toUpperCase()
          : null,
      city,
      name,
      display_name,
      zone_type,
      eligibility_status,
      currency_code,
      terms_version:
        typeof input.terms_version === "string" && input.terms_version.trim()
          ? input.terms_version.trim()
          : null,
      requires_admin_approval: input.requires_admin_approval !== false,
      is_active,
      sort_order:
        typeof input.sort_order === "number" && Number.isFinite(input.sort_order)
          ? Math.round(input.sort_order)
          : 0,
      metadata:
        input.metadata && typeof input.metadata === "object"
          ? input.metadata
          : {},
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Insert failed");

  const id = data.id as string;
  if (is_active && eligibility_status !== "disabled") {
    await syncDeliveryZoneForGeoZone({
      geoZoneId: id,
      displayName: display_name,
      countryCode: country_code,
      city: city!,
    });
  }
  return { id };
}

export async function updateGeoZone(
  sb: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; id: string }> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const str = (k: string) =>
    typeof body[k] === "string" ? (body[k] as string).trim() : undefined;
  const opt = (k: string) => {
    const v = str(k);
    if (v !== undefined) patch[k] = v || null;
  };
  opt("name");
  opt("display_name");
  if (typeof body.zone_type === "string") patch.zone_type = body.zone_type.trim();
  if (typeof body.eligibility_status === "string") {
    patch.eligibility_status = body.eligibility_status.trim();
  }
  if (typeof body.country_code === "string") {
    patch.country_code = body.country_code.trim().toUpperCase();
  }
  if (body.region_code === null) patch.region_code = null;
  else if (typeof body.region_code === "string") {
    patch.region_code = body.region_code.trim().toUpperCase() || null;
  }
  if (body.city === null) patch.city = null;
  else if (typeof body.city === "string") {
    patch.city = body.city.trim() || null;
  }
  if (typeof body.currency_code === "string") {
    patch.currency_code = body.currency_code.trim().toUpperCase() || null;
  }
  if (body.terms_version === null) patch.terms_version = null;
  else if (typeof body.terms_version === "string") {
    patch.terms_version = body.terms_version.trim() || null;
  }
  if (typeof body.requires_admin_approval === "boolean") {
    patch.requires_admin_approval = body.requires_admin_approval;
  }
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    patch.sort_order = Math.round(body.sort_order);
  }
  if (body.metadata && typeof body.metadata === "object") {
    patch.metadata = body.metadata;
  }

  const { data: before } = await sb
    .from("geo_zones")
    .select(
      "id, display_name, country_code, city, is_active, eligibility_status, default_delivery_zone_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!before) throw new Error("Not found");

  const mergedCity =
    patch.city !== undefined
      ? (patch.city as string | null)
      : (before as { city?: string | null }).city;
  const cityErr = geoZoneCityRequired(
    typeof mergedCity === "string" ? mergedCity : null,
  );
  if (cityErr) throw new Error(cityErr);

  const { data, error } = await sb
    .from("geo_zones")
    .update(patch)
    .eq("id", id)
    .select(
      "id, display_name, country_code, city, is_active, eligibility_status, default_delivery_zone_id",
    )
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Not found");

  const row = data as {
    id: string;
    display_name: string;
    country_code: string;
    city: string | null;
    is_active: boolean;
    eligibility_status: string;
    default_delivery_zone_id: string | null;
  };
  if (row.is_active && row.eligibility_status !== "disabled") {
    await syncDeliveryZoneForGeoZone({
      geoZoneId: row.id,
      displayName: row.display_name,
      countryCode: row.country_code,
      city: row.city!.trim(),
      existingDeliveryZoneId: row.default_delivery_zone_id,
    });
  }
  return { ok: true, id: row.id };
}

/** Delete geo zone only (caller handles linked delivery). */
export async function deleteGeoZoneRow(
  sb: SupabaseClient,
  id: string,
): Promise<{ default_delivery_zone_id: string | null; display_name: string }> {
  const { data: row, error: fetchErr } = await sb
    .from("geo_zones")
    .select("id, display_name, default_delivery_zone_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Vinzonen hittades inte.");

  const { error: delErr } = await sb.from("geo_zones").delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);

  revalidatePath("/admin/geo-zones");
  revalidatePath(`/admin/geo-zones/${id}`);
  return {
    default_delivery_zone_id: row.default_delivery_zone_id as string | null,
    display_name: row.display_name as string,
  };
}

// ── Shipping regions ─────────────────────────────────────────

export async function createShippingRegion(
  sb: SupabaseClient,
  input: { name: string; country_code: string; description?: string | null },
) {
  const name = input.name?.trim() ?? "";
  const rawCode = (input.country_code ?? "").trim().toUpperCase();
  if (!name) throw new Error("Name is required");
  if (rawCode.length !== 2) {
    throw new Error("country_code must be exactly 2 characters");
  }
  const description =
    typeof input.description === "string"
      ? input.description.trim() || null
      : input.description === null
        ? null
        : null;
  const { data, error } = await sb
    .from("shipping_regions")
    .insert({ name, country_code: rawCode, description })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { region: data };
}

export async function updateShippingRegion(
  sb: SupabaseClient,
  id: string,
  body: { name?: string; country_code?: string; description?: string | null },
) {
  const patch: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) {
    const n = typeof body.name === "string" ? body.name.trim() : "";
    if (!n) throw new Error("Name cannot be empty");
    patch.name = n;
  }
  if (body.country_code !== undefined) {
    const c =
      typeof body.country_code === "string"
        ? body.country_code.trim().toUpperCase()
        : "";
    if (c.length !== 2) {
      throw new Error("country_code must be exactly 2 characters");
    }
    patch.country_code = c;
  }
  if (body.description !== undefined) {
    patch.description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
  }
  const { data, error } = await sb
    .from("shipping_regions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { region: data };
}

export async function deleteShippingRegion(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("shipping_regions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true as const };
}

// ── Pickup zones (query cores; delete guards mirrored) ───────

export type PickupZoneInput = {
  name: string;
  radius_km: number;
  center_lat: number;
  center_lon: number;
  zone_type?: "pickup";
};

export async function createPickupZoneCore(
  sb: SupabaseClient,
  data: PickupZoneInput,
) {
  const { data: zone, error } = await sb
    .from("pallet_zones")
    .insert({
      name: data.name,
      radius_km: data.radius_km,
      center_lat: data.center_lat,
      center_lon: data.center_lon,
      zone_type: "pickup",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zones");
  return zone;
}

export async function updatePickupZoneCore(
  sb: SupabaseClient,
  id: string,
  data: Partial<PickupZoneInput>,
) {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.radius_km !== undefined) patch.radius_km = data.radius_km;
  if (data.center_lat !== undefined) patch.center_lat = data.center_lat;
  if (data.center_lon !== undefined) patch.center_lon = data.center_lon;
  // Never allow changing to delivery via this path
  const { data: zone, error } = await sb
    .from("pallet_zones")
    .update(patch)
    .eq("id", id)
    .eq("zone_type", "pickup")
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zones");
  revalidatePath(`/admin/zones/${id}`);
  return zone;
}

export async function deletePalletZoneCore(sb: SupabaseClient, id: string) {
  const { data: producers, error: producersError } = await sb
    .from("producers")
    .select("id, name")
    .eq("pickup_zone_id", id)
    .limit(5);
  if (producersError) {
    throw new Error(`Failed to check producer usage: ${producersError.message}`);
  }
  if (producers && producers.length > 0) {
    throw new Error(
      `Cannot delete zone: used by ${producers.length} producer(s). Reassign first.`,
    );
  }

  const { data: reservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id, status")
    .or(`pickup_zone_id.eq.${id},delivery_zone_id.eq.${id}`)
    .limit(5);
  if (reservationsError) {
    throw new Error(`Failed to check zone usage: ${reservationsError.message}`);
  }
  if (reservations && reservations.length > 0) {
    throw new Error(
      `Cannot delete zone: used in ${reservations.length} reservation(s).`,
    );
  }

  const { data: pallets, error: palletsError } = await sb
    .from("pallets")
    .select("id, name")
    .or(`pickup_zone_id.eq.${id},delivery_zone_id.eq.${id}`)
    .limit(5);
  if (palletsError) {
    throw new Error(`Failed to check pallet usage: ${palletsError.message}`);
  }
  if (pallets && pallets.length > 0) {
    throw new Error(
      `Cannot delete zone: used in ${pallets.length} pallet(s).`,
    );
  }

  const { error } = await sb.from("pallet_zones").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/zones");
}

// ── Customer shipping rates ──────────────────────────────────

export async function createCustomerShippingRate(
  sb: SupabaseClient,
  body: Record<string, unknown>,
  createdBy?: string | null,
) {
  const flat = Math.max(0, Math.round(Number(body.flat_fee_cents) || 0));
  const free = body.free_shipping === true;
  if (!free && flat <= 0) {
    throw new Error(
      "flat_fee_cents must be > 0 unless free_shipping is true (do not invent a commercial rate)",
    );
  }
  const row = {
    channel: "pact",
    country_code:
      typeof body.country_code === "string" && body.country_code.trim()
        ? body.country_code.trim().toUpperCase()
        : "SE",
    flat_fee_cents: free ? 0 : flat,
    free_shipping: free,
    free_shipping_threshold_cents:
      body.free_shipping_threshold_cents == null
        ? null
        : Math.round(Number(body.free_shipping_threshold_cents)),
    min_bottles:
      body.min_bottles == null ? null : Math.round(Number(body.min_bottles)),
    max_bottles:
      body.max_bottles == null ? null : Math.round(Number(body.max_bottles)),
    active: body.active !== false,
    notes: typeof body.notes === "string" ? body.notes : null,
    created_by: createdBy ?? null,
  };
  const { data, error } = await sb
    .from("customer_shipping_rates")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { entry: data };
}

export async function updateCustomerShippingRate(
  sb: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
) {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.flat_fee_cents != null) {
    patch.flat_fee_cents = Math.max(0, Math.round(Number(body.flat_fee_cents) || 0));
  }
  if (body.free_shipping != null) patch.free_shipping = Boolean(body.free_shipping);
  if (body.free_shipping_threshold_cents !== undefined) {
    patch.free_shipping_threshold_cents =
      body.free_shipping_threshold_cents == null
        ? null
        : Math.round(Number(body.free_shipping_threshold_cents));
  }
  if (body.country_code !== undefined) patch.country_code = body.country_code;
  if (body.active != null) patch.active = Boolean(body.active);
  if (body.notes !== undefined) patch.notes = body.notes;

  const { data, error } = await sb
    .from("customer_shipping_rates")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { entry: data };
}

// ── Freight catalogue ────────────────────────────────────────

export type FreightCatalogueKind =
  | "provider"
  | "service"
  | "rate"
  | "component"
  | "packaging";

export async function createFreightCatalogueEntry(
  sb: SupabaseClient,
  body: { kind: FreightCatalogueKind } & Record<string, unknown>,
) {
  const kind = String(body.kind || "") as FreightCatalogueKind;
  if (kind === "provider") {
    const { data, error } = await sb
      .from("logistics_providers")
      .insert({
        name: body.name,
        code: strOrNull(body.code),
        default_currency: body.default_currency ?? "EUR",
        active: body.active !== false,
        notes: strOrNull(body.notes),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  if (kind === "service") {
    const { data, error } = await sb
      .from("freight_services")
      .insert({
        provider_id: body.provider_id,
        name: body.name,
        direction: body.direction ?? "INBOUND",
        origin_country: strOrNull(body.origin_country),
        origin_region: strOrNull(body.origin_region),
        destination_country: strOrNull(body.destination_country),
        destination_region: strOrNull(body.destination_region),
        transport_mode: body.transport_mode,
        pricing_type: body.pricing_type ?? "RATE_CARD",
        lead_time_days_min: intOrNull(body.lead_time_days_min),
        lead_time_days_max: intOrNull(body.lead_time_days_max),
        active: body.active !== false,
        notes: strOrNull(body.notes),
        route_description: strOrNull(body.route_description),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  if (kind === "rate") {
    const { data, error } = await sb
      .from("freight_rates")
      .insert({
        freight_service_id: body.freight_service_id,
        base_price_amount: numOrNull(body.base_price_amount),
        currency: body.currency ?? "EUR",
        unit_type: body.unit_type ?? "PER_PALLET",
        max_weight_kg: numOrNull(body.max_weight_kg),
        pallet_type: strOrNull(body.pallet_type),
        pricing_type: body.pricing_type ?? null,
        valid_from: strOrNull(body.valid_from),
        valid_to: strOrNull(body.valid_to),
        active: body.active !== false,
        notes: strOrNull(body.notes),
        pricing_basis: strOrNull(body.pricing_basis),
        price_per_increment: numOrNull(body.price_per_increment),
        increment_kg: numOrNull(body.increment_kg),
        volumetric_factor: numOrNull(body.volumetric_factor),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  if (kind === "component") {
    const { data, error } = await sb
      .from("freight_rate_components")
      .insert({
        freight_rate_id: body.freight_rate_id,
        name: body.name,
        code: strOrNull(body.code),
        component_kind: body.component_kind ?? "SURCHARGE",
        calculation_type: body.calculation_type,
        value: numOrNull(body.value),
        currency: body.currency ?? "EUR",
        is_mandatory: body.is_mandatory === true,
        is_optional: body.is_optional === true,
        valid_from: strOrNull(body.valid_from),
        valid_to: strOrNull(body.valid_to),
        sort_order: intOrNull(body.sort_order) ?? 0,
        notes: strOrNull(body.notes),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  if (kind === "packaging") {
    const { data, error } = await sb
      .from("packaging_profiles")
      .insert({
        code: body.code,
        name: body.name,
        length_m: numOrNull(body.length_m),
        width_m: numOrNull(body.width_m),
        height_m: numOrNull(body.height_m),
        tare_weight_kg: numOrNull(body.tare_weight_kg),
        max_bottles: intOrNull(body.max_bottles),
        min_bottles: intOrNull(body.min_bottles),
        active: body.active !== false,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  throw new Error(`Unknown kind: ${kind}`);
}

export async function updateFreightCatalogueEntry(
  sb: SupabaseClient,
  body: { kind: FreightCatalogueKind; id: string } & Record<string, unknown>,
) {
  const kind = String(body.kind || "") as FreightCatalogueKind;
  const id = String(body.id || "");
  if (!id) throw new Error("id is required");

  const table =
    kind === "provider"
      ? "logistics_providers"
      : kind === "service"
        ? "freight_services"
        : kind === "rate"
          ? "freight_rates"
          : kind === "component"
            ? "freight_rate_components"
            : kind === "packaging"
              ? "packaging_profiles"
              : null;
  if (!table) throw new Error(`Unknown kind: ${kind}`);

  const { id: _id, kind: _kind, ...rest } = body;
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    if (k === "active") patch.active = v === true;
    else patch[k] = v;
  }
  if (Object.keys(patch).length === 0) throw new Error("No fields to update");

  const { data, error } = await sb
    .from(table)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── PACT pallets ─────────────────────────────────────────────

export type CreatePactPalletInput = {
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  min_bottles_to_complete?: number;
  last_mile_cost_cents_per_bottle?: number | null;
  freight_target_cents?: number | null;
};

function assertPactPalletInput(input: CreatePactPalletInput) {
  if (!input.name?.trim()) throw new Error("Name is required");
  if (!input.delivery_zone_id) throw new Error("delivery_zone_id is required");
  if (!input.pickup_zone_id) throw new Error("pickup_zone_id is required");
  if (input.delivery_zone_id === input.pickup_zone_id) {
    throw new Error("delivery_zone_id and pickup_zone_id must differ");
  }
  const cap = Math.floor(Number(input.bottle_capacity) || 0);
  if (cap <= 0) throw new Error("bottle_capacity must be > 0");
  const min =
    input.min_bottles_to_complete != null
      ? Math.floor(Number(input.min_bottles_to_complete) || 0)
      : undefined;
  if (min != null && (min <= 0 || min > cap)) {
    throw new Error("min_bottles_to_complete must be > 0 and ≤ bottle_capacity");
  }
}

export async function createPactPallet(
  sb: SupabaseClient,
  input: CreatePactPalletInput,
) {
  assertPactPalletInput(input);
  const row = {
    name: input.name.trim(),
    description: input.description ?? null,
    delivery_zone_id: input.delivery_zone_id,
    pickup_zone_id: input.pickup_zone_id,
    cost_cents: Math.max(0, Math.round(Number(input.cost_cents) || 0)),
    bottle_capacity: Math.floor(Number(input.bottle_capacity)),
    min_bottles_to_complete:
      input.min_bottles_to_complete != null
        ? Math.floor(Number(input.min_bottles_to_complete))
        : undefined,
    last_mile_cost_cents_per_bottle:
      input.last_mile_cost_cents_per_bottle ?? null,
    freight_target_cents: input.freight_target_cents ?? null,
  };
  const { data, error } = await sb.from("pallets").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

/** MCP path: never accepts status / status_mode / is_complete. */
export async function updatePactPalletFields(
  sb: SupabaseClient,
  id: string,
  input: Partial<CreatePactPalletInput>,
) {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.delivery_zone_id !== undefined) {
    patch.delivery_zone_id = input.delivery_zone_id;
  }
  if (input.pickup_zone_id !== undefined) {
    patch.pickup_zone_id = input.pickup_zone_id;
  }
  if (input.cost_cents !== undefined) {
    patch.cost_cents = Math.max(0, Math.round(Number(input.cost_cents) || 0));
  }
  if (input.bottle_capacity !== undefined) {
    const cap = Math.floor(Number(input.bottle_capacity) || 0);
    if (cap <= 0) throw new Error("bottle_capacity must be > 0");
    patch.bottle_capacity = cap;
  }
  if (input.min_bottles_to_complete !== undefined) {
    patch.min_bottles_to_complete = Math.floor(
      Number(input.min_bottles_to_complete) || 0,
    );
  }
  if (input.last_mile_cost_cents_per_bottle !== undefined) {
    patch.last_mile_cost_cents_per_bottle =
      input.last_mile_cost_cents_per_bottle;
  }
  if (input.freight_target_cents !== undefined) {
    patch.freight_target_cents = input.freight_target_cents;
  }

  if (
    patch.delivery_zone_id &&
    patch.pickup_zone_id &&
    patch.delivery_zone_id === patch.pickup_zone_id
  ) {
    throw new Error("delivery_zone_id and pickup_zone_id must differ");
  }

  const { data, error } = await sb
    .from("pallets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await syncPalletShipReadiness(id);
  return data;
}

export async function deletePactPallet(sb: SupabaseClient, id: string) {
  const { data: activeReservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id")
    .eq("pallet_id", id)
    .not("status", "in", NON_ACTIVE_RESERVATION_STATUSES_POSTGREST)
    .limit(1);
  if (reservationsError) {
    throw new Error(reservationsError.message);
  }
  if (activeReservations && activeReservations.length > 0) {
    throw new Error(
      "Cannot delete pallet with active reservations. Cancel or reassign first.",
    );
  }
  const { error } = await sb.from("pallets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function selectPactPalletFreightQuote(
  palletId: string,
  quoteId: string,
) {
  await selectPalletFreightQuote(palletId, quoteId);
  return { ok: true as const, pallet_id: palletId, quote_id: quoteId };
}
