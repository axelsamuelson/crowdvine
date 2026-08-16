import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

/** Full freight catalogue for admin config UI. Never expose to customer APIs. */
export async function GET() {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();

    const { data: providers, error: pErr } = await sb
      .from("logistics_providers")
      .select("*")
      .order("name");
    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    const { data: services, error: sErr } = await sb
      .from("freight_services")
      .select("*")
      .order("name");
    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }

    const { data: rates, error: rErr } = await sb
      .from("freight_rates")
      .select("*")
      .order("created_at", { ascending: false });
    if (rErr) {
      return NextResponse.json({ error: rErr.message }, { status: 500 });
    }

    const rateIds = (rates ?? []).map((r) => r.id as string);
    let components: Record<string, unknown>[] = [];
    if (rateIds.length > 0) {
      const { data: comps, error: cErr } = await sb
        .from("freight_rate_components")
        .select("*")
        .in("freight_rate_id", rateIds)
        .order("sort_order");
      if (cErr) {
        return NextResponse.json({ error: cErr.message }, { status: 500 });
      }
      components = (comps ?? []) as Record<string, unknown>[];
    }

    const { data: packaging, error: pkgErr } = await sb
      .from("packaging_profiles")
      .select("*")
      .order("code");
    if (pkgErr) {
      return NextResponse.json({ error: pkgErr.message }, { status: 500 });
    }

    return NextResponse.json({
      providers: providers ?? [],
      services: services ?? [],
      rates: rates ?? [],
      components,
      packaging: packaging ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();
    const body = await request.json();
    const kind = String(body.kind || "");

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
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (kind === "service") {
      const { data, error } = await sb
        .from("freight_services")
        .insert({
          provider_id: body.provider_id,
          name: body.name,
          direction: body.direction ?? "INBOUND",
          origin_country: strOrNull(body.origin_country),
          origin_region_code: strOrNull(body.origin_region_code),
          origin_description: strOrNull(body.origin_description),
          destination_country: strOrNull(body.destination_country),
          destination_region_code: strOrNull(body.destination_region_code),
          destination_description: strOrNull(body.destination_description),
          route_description: strOrNull(body.route_description),
          transport_mode: body.transport_mode,
          pricing_type: body.pricing_type ?? "RATE_CARD",
          active: body.active !== false,
          lead_time_min_days: intOrNull(body.lead_time_min_days),
          lead_time_max_days: intOrNull(body.lead_time_max_days),
          notes: strOrNull(body.notes),
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
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
          max_pallets: intOrNull(body.max_pallets),
          pallet_type: strOrNull(body.pallet_type),
          valid_from: strOrNull(body.valid_from),
          valid_to: strOrNull(body.valid_to),
          active: body.active !== false,
          pricing_type: body.pricing_type ?? "FIXED",
          pricing_basis: strOrNull(body.pricing_basis),
          included_weight_kg: numOrNull(body.included_weight_kg),
          weight_increment_kg: numOrNull(body.weight_increment_kg),
          increment_price_amount: numOrNull(body.increment_price_amount),
          volumetric_factor: numOrNull(body.volumetric_factor),
          notes: strOrNull(body.notes),
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
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
          currency: strOrNull(body.currency),
          is_mandatory: body.is_mandatory === true,
          is_optional: body.is_optional === true,
          valid_from: strOrNull(body.valid_from),
          valid_to: strOrNull(body.valid_to),
          sort_order: intOrNull(body.sort_order) ?? 0,
          notes: strOrNull(body.notes),
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (kind === "packaging") {
      const { data, error } = await sb
        .from("packaging_profiles")
        .insert({
          code: body.code,
          name: body.name,
          active: body.active !== false,
          length_m: numOrNull(body.length_m),
          width_m: numOrNull(body.width_m),
          height_m: numOrNull(body.height_m),
          tare_weight_kg: numOrNull(body.tare_weight_kg),
          max_bottles: intOrNull(body.max_bottles),
          min_bottles: intOrNull(body.min_bottles),
          notes: strOrNull(body.notes),
        })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

/** Update catalogue rows. Rate-card edits do not mutate historical pallet/outbound quotes. */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const sb = getSupabaseAdmin();
    const body = await request.json();
    const kind = String(body.kind || "");
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (kind === "provider") {
      const patch: Record<string, unknown> = { updated_at: now };
      if ("name" in body) patch.name = body.name;
      if ("code" in body) patch.code = strOrNull(body.code);
      if ("default_currency" in body) patch.default_currency = body.default_currency;
      if ("active" in body) patch.active = body.active === true;
      if ("notes" in body) patch.notes = strOrNull(body.notes);
      const { data, error } = await sb
        .from("logistics_providers")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (kind === "service") {
      const patch: Record<string, unknown> = { updated_at: now };
      if ("provider_id" in body) patch.provider_id = body.provider_id;
      if ("name" in body) patch.name = body.name;
      if ("direction" in body) patch.direction = body.direction;
      if ("origin_country" in body) patch.origin_country = strOrNull(body.origin_country);
      if ("origin_region_code" in body) {
        patch.origin_region_code = strOrNull(body.origin_region_code);
      }
      if ("origin_description" in body) {
        patch.origin_description = strOrNull(body.origin_description);
      }
      if ("destination_country" in body) {
        patch.destination_country = strOrNull(body.destination_country);
      }
      if ("destination_region_code" in body) {
        patch.destination_region_code = strOrNull(body.destination_region_code);
      }
      if ("destination_description" in body) {
        patch.destination_description = strOrNull(body.destination_description);
      }
      if ("route_description" in body) {
        patch.route_description = strOrNull(body.route_description);
      }
      if ("transport_mode" in body) patch.transport_mode = body.transport_mode;
      if ("pricing_type" in body) patch.pricing_type = body.pricing_type;
      if ("active" in body) patch.active = body.active === true;
      if ("lead_time_min_days" in body) {
        patch.lead_time_min_days = intOrNull(body.lead_time_min_days);
      }
      if ("lead_time_max_days" in body) {
        patch.lead_time_max_days = intOrNull(body.lead_time_max_days);
      }
      if ("notes" in body) patch.notes = strOrNull(body.notes);
      const { data, error } = await sb
        .from("freight_services")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (kind === "rate") {
      const patch: Record<string, unknown> = { updated_at: now };
      if ("freight_service_id" in body) {
        patch.freight_service_id = body.freight_service_id;
      }
      if ("base_price_amount" in body) {
        patch.base_price_amount = numOrNull(body.base_price_amount);
      }
      if ("currency" in body) patch.currency = body.currency;
      if ("unit_type" in body) patch.unit_type = body.unit_type;
      if ("max_weight_kg" in body) patch.max_weight_kg = numOrNull(body.max_weight_kg);
      if ("max_pallets" in body) patch.max_pallets = intOrNull(body.max_pallets);
      if ("pallet_type" in body) patch.pallet_type = strOrNull(body.pallet_type);
      if ("valid_from" in body) patch.valid_from = strOrNull(body.valid_from);
      if ("valid_to" in body) patch.valid_to = strOrNull(body.valid_to);
      if ("active" in body) patch.active = body.active === true;
      if ("pricing_type" in body) patch.pricing_type = body.pricing_type;
      if ("pricing_basis" in body) patch.pricing_basis = strOrNull(body.pricing_basis);
      if ("included_weight_kg" in body) {
        patch.included_weight_kg = numOrNull(body.included_weight_kg);
      }
      if ("weight_increment_kg" in body) {
        patch.weight_increment_kg = numOrNull(body.weight_increment_kg);
      }
      if ("increment_price_amount" in body) {
        patch.increment_price_amount = numOrNull(body.increment_price_amount);
      }
      if ("volumetric_factor" in body) {
        patch.volumetric_factor = numOrNull(body.volumetric_factor);
      }
      if ("notes" in body) patch.notes = strOrNull(body.notes);
      const { data, error } = await sb
        .from("freight_rates")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (kind === "component") {
      const patch: Record<string, unknown> = { updated_at: now };
      if ("name" in body) patch.name = body.name;
      if ("code" in body) patch.code = strOrNull(body.code);
      if ("component_kind" in body) patch.component_kind = body.component_kind;
      if ("calculation_type" in body) patch.calculation_type = body.calculation_type;
      if ("value" in body) patch.value = numOrNull(body.value);
      if ("currency" in body) patch.currency = strOrNull(body.currency);
      if ("is_mandatory" in body) patch.is_mandatory = body.is_mandatory === true;
      if ("is_optional" in body) patch.is_optional = body.is_optional === true;
      if ("valid_from" in body) patch.valid_from = strOrNull(body.valid_from);
      if ("valid_to" in body) patch.valid_to = strOrNull(body.valid_to);
      if ("sort_order" in body) patch.sort_order = intOrNull(body.sort_order) ?? 0;
      if ("notes" in body) patch.notes = strOrNull(body.notes);
      const { data, error } = await sb
        .from("freight_rate_components")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (kind === "packaging") {
      const patch: Record<string, unknown> = { updated_at: now };
      if ("code" in body) patch.code = body.code;
      if ("name" in body) patch.name = body.name;
      if ("active" in body) patch.active = body.active === true;
      if ("length_m" in body) patch.length_m = numOrNull(body.length_m);
      if ("width_m" in body) patch.width_m = numOrNull(body.width_m);
      if ("height_m" in body) patch.height_m = numOrNull(body.height_m);
      if ("tare_weight_kg" in body) {
        patch.tare_weight_kg = numOrNull(body.tare_weight_kg);
      }
      if ("max_bottles" in body) patch.max_bottles = intOrNull(body.max_bottles);
      if ("min_bottles" in body) patch.min_bottles = intOrNull(body.min_bottles);
      if ("notes" in body) patch.notes = strOrNull(body.notes);
      const { data, error } = await sb
        .from("packaging_profiles")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
