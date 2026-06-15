import type { SupabaseClient } from "@supabase/supabase-js";

/** Ensure manual pickup producer is represented on the pallet (via wine line items). */
export async function validateB2bPickupProducerId(
  sb: SupabaseClient,
  pickupProducerId: string | null | undefined,
  wineIds: string[],
): Promise<
  | { ok: true; pickupProducerId: string | null }
  | { ok: false; error: string }
> {
  if (pickupProducerId == null || pickupProducerId === "") {
    return { ok: true, pickupProducerId: null };
  }

  const uniqueWineIds = [...new Set(wineIds.filter(Boolean))];
  if (uniqueWineIds.length === 0) {
    return {
      ok: false,
      error: "Upphämtningsproducent kräver minst ett vin på pallen",
    };
  }

  const { data: wines, error } = await sb
    .from("wines")
    .select("id, producer_id")
    .in("id", uniqueWineIds);

  if (error) {
    return { ok: false, error: error.message };
  }

  const producerIds = new Set(
    (wines ?? [])
      .map((w) => w.producer_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  if (!producerIds.has(pickupProducerId)) {
    return {
      ok: false,
      error: "Upphämtningsproducenten måste ha vin på pallen",
    };
  }

  return { ok: true, pickupProducerId };
}
