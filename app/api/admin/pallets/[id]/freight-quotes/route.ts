import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  buildAndPersistPalletFreightQuote,
  selectPalletFreightQuote,
} from "@/lib/pallet-freight-quotes";
import type { FreightComponentInput } from "@/lib/freight-pricing";
import { calculateFreightQuoteBreakdown } from "@/lib/freight-pricing";
import { headers } from "next/headers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id: palletId } = await params;
    const sb = getSupabaseAdmin();

    const { data: quotes, error } = await sb
      .from("pallet_freight_quotes")
      .select(
        `
        *,
        provider:logistics_providers(id, name, code),
        service:freight_services(id, name, transport_mode, pricing_type, route_description),
        rate:freight_rates(id, base_price_amount, currency, max_weight_kg, pallet_type, pricing_type)
      `,
      )
      .eq("pallet_id", palletId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quotes: quotes ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id: palletId } = await params;
    const body = await request.json();
    const hdrs = await headers();
    const origin = hdrs.get("origin") || undefined;

    if (body.action === "preview") {
      const breakdown = calculateFreightQuoteBreakdown({
        currency: body.currency ?? "EUR",
        baseAmountMajor: body.base_amount_major ?? null,
        palletCount: body.pallet_count ?? 1,
        weightKg: body.weight_kg ?? null,
        components: (body.components ?? []) as FreightComponentInput[],
        serviceSpotAmountMajor: body.service_spot_amount_major ?? null,
        servicePricingType: body.service_pricing_type ?? "RATE_CARD",
      });
      return NextResponse.json({ breakdown });
    }

    if (body.action === "select") {
      await selectPalletFreightQuote(palletId, String(body.quote_id));
      return NextResponse.json({ ok: true });
    }

    const { quote, breakdown } = await buildAndPersistPalletFreightQuote({
      palletId,
      providerId: String(body.provider_id),
      freightServiceId: String(body.freight_service_id),
      freightRateId: body.freight_rate_id ? String(body.freight_rate_id) : null,
      transportMode: body.transport_mode ?? null,
      currency: body.currency ?? "EUR",
      baseAmountMajor:
        body.base_amount_major != null ? Number(body.base_amount_major) : null,
      servicePricingType: body.service_pricing_type ?? "RATE_CARD",
      serviceSpotAmountMajor:
        body.service_spot_amount_major != null
          ? Number(body.service_spot_amount_major)
          : null,
      palletCount: body.pallet_count ?? 1,
      weightKg: body.weight_kg != null ? Number(body.weight_kg) : null,
      maxWeightKg: body.max_weight_kg != null ? Number(body.max_weight_kg) : null,
      palletType: body.pallet_type ?? null,
      components: (body.components ?? []) as FreightComponentInput[],
      leadTimeMinDays: body.lead_time_min_days ?? null,
      leadTimeMaxDays: body.lead_time_max_days ?? null,
      quotedAt: body.quoted_at ?? null,
      validUntil: body.valid_until ?? null,
      notes: body.notes ?? null,
      selectIfUsable: body.select_if_usable === true,
      origin,
    });

    return NextResponse.json({ quote, breakdown });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Unauthorized" || msg.includes("admin") ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
