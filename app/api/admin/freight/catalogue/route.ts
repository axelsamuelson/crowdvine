import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

    return NextResponse.json({
      providers: providers ?? [],
      services: services ?? [],
      rates: rates ?? [],
      components,
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
          code: body.code ?? null,
          default_currency: body.default_currency ?? "EUR",
          active: body.active !== false,
          notes: body.notes ?? null,
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
          origin_country: body.origin_country ?? null,
          origin_region_code: body.origin_region_code ?? null,
          origin_description: body.origin_description ?? null,
          destination_country: body.destination_country ?? null,
          destination_region_code: body.destination_region_code ?? null,
          destination_description: body.destination_description ?? null,
          route_description: body.route_description ?? null,
          transport_mode: body.transport_mode,
          pricing_type: body.pricing_type ?? "RATE_CARD",
          active: body.active !== false,
          lead_time_min_days: body.lead_time_min_days ?? null,
          lead_time_max_days: body.lead_time_max_days ?? null,
          notes: body.notes ?? null,
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
          base_price_amount: body.base_price_amount ?? null,
          currency: body.currency ?? "EUR",
          unit_type: body.unit_type ?? "PER_PALLET",
          max_weight_kg: body.max_weight_kg ?? null,
          max_pallets: body.max_pallets ?? null,
          pallet_type: body.pallet_type ?? null,
          valid_from: body.valid_from ?? null,
          valid_to: body.valid_to ?? null,
          active: body.active !== false,
          pricing_type: body.pricing_type ?? "FIXED",
          notes: body.notes ?? null,
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
          code: body.code ?? null,
          component_kind: body.component_kind ?? "SURCHARGE",
          calculation_type: body.calculation_type,
          value: body.value ?? null,
          currency: body.currency ?? null,
          is_mandatory: body.is_mandatory === true,
          is_optional: body.is_optional === true,
          valid_from: body.valid_from ?? null,
          valid_to: body.valid_to ?? null,
          sort_order: body.sort_order ?? 0,
          notes: body.notes ?? null,
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
