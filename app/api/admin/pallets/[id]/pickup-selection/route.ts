import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getPalletPickupSelectionState,
  loadPalletProducerBottleCounts,
} from "@/lib/pallet-pickup-selection";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: palletId } = await params;
  if (!palletId) {
    return NextResponse.json({ error: "Missing pallet id" }, { status: 400 });
  }

  const state = await getPalletPickupSelectionState(palletId);
  if (!state) {
    return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
  }

  const { producers } = await loadPalletProducerBottleCounts(palletId);
  const candidates = producers
    .filter((p) => p.isPalletZone)
    .map((p) => ({
      id: p.producerId,
      name: p.name ?? p.producerId,
      bottles: p.bottles,
      isSuggested:
        state.suggestion.meetsThreshold &&
        state.suggestion.producerId === p.producerId,
    }))
    .sort((a, b) => {
      if (b.bottles !== a.bottles) return b.bottles - a.bottles;
      return a.name.localeCompare(b.name, "sv");
    });

  let confirmedByEmail: string | null = null;
  if (state.confirmedBy) {
    const sb = getSupabaseAdmin();
    const { data: profile } = await sb
      .from("profiles")
      .select("email")
      .eq("id", state.confirmedBy)
      .maybeSingle();
    confirmedByEmail = (profile?.email as string | null) ?? null;
  }

  return NextResponse.json({
    selection: {
      ...state,
      confirmedByEmail,
    },
    candidates,
  });
}
