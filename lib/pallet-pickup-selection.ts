/**
 * Manual "becomes physical" pickup selection for PACT pallets.
 * After fill changes: compute suggestion + fire admin task at trigger.
 * Does not auto-write current_pickup_producer_id — admin confirms explicitly.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  PALLET_FILL_STATUSES,
  sumReservedBottlesOnPallet,
} from "@/lib/pallet-fill-count";
import { resolveMinBottlesToShip } from "@/lib/pallet-ship-progress";
import { getPalletPhysicalSettings } from "@/lib/pallet-physical-settings";
import {
  estimatePalletWeightKg,
  isPalletWeightOverLimit,
  isPickupSelectionTriggerReached,
  suggestPickupProducer,
  type PickupSuggestion,
  type ProducerBottleCount,
} from "@/lib/pallet-pickup-suggestion";

export type PalletPickupSelectionState = {
  suggestion: PickupSuggestion;
  bottlesFilled: number;
  minBottlesToShip: number;
  triggerReached: boolean;
  triggerShare: number;
  triggerBottles: number;
  confirmed: boolean;
  confirmedAt: string | null;
  confirmedBy: string | null;
  currentPickupProducerId: string | null;
  estimatedWeightKg: number;
  weightLimitKg: number | null;
  kgPerBottle: number;
  weightOverLimit: boolean;
  selectionTriggeredAt: string | null;
  selectionTaskId: string | null;
};

async function resolveSystemAdminId(
  sb: ReturnType<typeof getSupabaseAdmin>,
): Promise<string | null> {
  const { data, error } = await sb
    .from("profiles")
    .select("id, role, roles")
    .or("role.eq.admin,roles.cs.{admin}")
    .limit(20);

  if (error) {
    console.error("[pallet-pickup-selection] admin lookup:", error.message);
    return null;
  }

  for (const row of data ?? []) {
    const id = row.id as string | undefined;
    if (!id) continue;
    if (row.role === "admin") return id;
    if (Array.isArray(row.roles) && (row.roles as string[]).includes("admin")) {
      return id;
    }
  }
  return null;
}

/** Load producer bottle counts for a pallet (fill-eligible reservations). */
export async function loadPalletProducerBottleCounts(
  palletId: string,
): Promise<{
  totalBottles: number;
  producers: ProducerBottleCount[];
  shippingRegionId: string | null;
}> {
  const sb = getSupabaseAdmin();
  const { data: pallet, error: pErr } = await sb
    .from("pallets")
    .select("id, shipping_region_id")
    .eq("id", palletId)
    .maybeSingle();

  if (pErr || !pallet) {
    if (pErr) {
      console.error(
        "[loadPalletProducerBottleCounts] pallet:",
        pErr.message,
      );
    }
    return { totalBottles: 0, producers: [], shippingRegionId: null };
  }

  const regionId = (pallet.shipping_region_id as string | null) ?? null;
  let totalBottles = 0;
  try {
    totalBottles = await sumReservedBottlesOnPallet(palletId);
  } catch (e) {
    console.error("[loadPalletProducerBottleCounts] bottles:", e);
  }

  if (!regionId) {
    return { totalBottles, producers: [], shippingRegionId: null };
  }

  const { data: regionProducers, error: rpErr } = await sb
    .from("producers")
    .select("id, name, is_pallet_zone")
    .eq("shipping_region_id", regionId);

  if (rpErr || !regionProducers?.length) {
    if (rpErr) {
      console.error(
        "[loadPalletProducerBottleCounts] producers:",
        rpErr.message,
      );
    }
    return { totalBottles, producers: [], shippingRegionId: regionId };
  }

  const counts = new Map<string, ProducerBottleCount>();
  for (const r of regionProducers) {
    const id = String(r.id ?? "");
    if (!id) continue;
    counts.set(id, {
      producerId: id,
      bottles: 0,
      isPalletZone: r.is_pallet_zone === true,
      name: (r.name as string | null) ?? null,
    });
  }

  const { data: reservations, error: rErr } = await sb
    .from("order_reservations")
    .select("id")
    .eq("pallet_id", palletId)
    .in("status", [...PALLET_FILL_STATUSES])
    .is("archived_at", null);

  if (rErr) {
    console.error(
      "[loadPalletProducerBottleCounts] reservations:",
      rErr.message,
    );
    return {
      totalBottles,
      producers: [...counts.values()],
      shippingRegionId: regionId,
    };
  }

  const resIds = (reservations ?? [])
    .map((r) => r.id as string | null | undefined)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (resIds.length > 0) {
    const { data: oriRows, error: oriErr } = await sb
      .from("order_reservation_items")
      .select("quantity, item_id")
      .in("reservation_id", resIds);

    if (!oriErr && oriRows?.length) {
      const wineIds = [
        ...new Set(
          oriRows
            .map((row) => row.item_id as string | null | undefined)
            .filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            ),
        ),
      ];
      if (wineIds.length > 0) {
        const { data: wineRows } = await sb
          .from("wines")
          .select("id, producer_id")
          .in("id", wineIds);
        const wineToProducer = new Map(
          (wineRows ?? []).map((w) => [
            w.id as string,
            w.producer_id as string | null,
          ]),
        );
        for (const row of oriRows) {
          const wineId = row.item_id as string | null | undefined;
          if (!wineId) continue;
          const prod = wineToProducer.get(wineId);
          if (!prod || !counts.has(prod)) continue;
          const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
          const entry = counts.get(prod)!;
          entry.bottles += qty;
        }
      }
    }
  }

  return {
    totalBottles,
    producers: [...counts.values()].sort((a, b) =>
      a.producerId.localeCompare(b.producerId),
    ),
    shippingRegionId: regionId,
  };
}

async function ensurePickupSelectionAdminTask(input: {
  palletId: string;
  palletName: string;
  bottlesFilled: number;
  minBottlesToShip: number;
  triggerShare: number;
  suggestion: PickupSuggestion;
}): Promise<string | null> {
  const sb = getSupabaseAdmin();
  const adminId = await resolveSystemAdminId(sb);
  if (!adminId) {
    console.error(
      "[ensurePickupSelectionAdminTask] no admin profile for created_by",
    );
    return null;
  }

  const triggerBottles = Math.ceil(
    input.minBottlesToShip * input.triggerShare,
  );
  const suggestionLabel = input.suggestion.meetsThreshold
    ? `${input.suggestion.producerName ?? input.suggestion.producerId} (${input.suggestion.bottles} bottles)`
    : "no producer yet meets the 20% pallet-zone rule";

  const title = `Choose pickup location: ${input.palletName}`;
  const description = [
    `Pallet reached the pickup-selection trigger (${input.bottlesFilled}/${triggerBottles} bottles; ${Math.round(input.triggerShare * 100)}% of min ${input.minBottlesToShip}).`,
    `Suggested pickup: ${suggestionLabel}.`,
    "Confirm the pickup producer manually in admin pallet details. No customer or producer emails were sent.",
  ].join("\n");

  const { data: task, error: taskErr } = await sb
    .from("admin_tasks")
    .insert({
      title,
      description,
      status: "todo",
      priority: "high",
      task_type: "ops",
      created_by: adminId,
    })
    .select("id")
    .single();

  if (taskErr || !task?.id) {
    console.error(
      "[ensurePickupSelectionAdminTask] insert:",
      taskErr?.message,
    );
    return null;
  }

  const taskId = task.id as string;
  const { error: linkErr } = await sb.from("admin_entity_links").insert({
    task_id: taskId,
    entity_type: "pallet",
    entity_id: input.palletId,
    label: input.palletName,
  });
  if (linkErr) {
    console.error(
      "[ensurePickupSelectionAdminTask] entity link:",
      linkErr.message,
    );
  }

  return taskId;
}

/**
 * After pallet fill changes: evaluate trigger and create one admin task.
 * Never writes current_pickup_producer_id (manual confirm only).
 */
export async function evaluatePalletPickupSelection(palletId: string): Promise<{
  triggerReached: boolean;
  taskCreated: boolean;
  taskId: string | null;
  suggestion: PickupSuggestion;
}> {
  const noopSuggestion = suggestPickupProducer([], 0);
  try {
    const sb = getSupabaseAdmin();
    const { data: pallet, error: pErr } = await sb
      .from("pallets")
      .select(
        `
        id,
        name,
        status,
        min_bottles_to_complete,
        current_pickup_producer_id,
        pickup_producer_confirmed_at,
        pickup_selection_triggered_at,
        pickup_selection_task_id
      `,
      )
      .eq("id", palletId)
      .maybeSingle();

    if (pErr || !pallet) {
      if (pErr) {
        console.error(
          "[evaluatePalletPickupSelection] pallet:",
          pErr.message,
        );
      }
      return {
        triggerReached: false,
        taskCreated: false,
        taskId: null,
        suggestion: noopSuggestion,
      };
    }

    const settings = await getPalletPhysicalSettings();
    const { totalBottles, producers } =
      await loadPalletProducerBottleCounts(palletId);
    const suggestion = suggestPickupProducer(producers, totalBottles);
    const minBottlesToShip = resolveMinBottlesToShip(
      pallet.min_bottles_to_complete,
    );
    const triggerReached = isPickupSelectionTriggerReached({
      bottlesFilled: totalBottles,
      minBottlesToShip,
      triggerShare: settings.pickupSelectionTriggerShare,
    });

    const alreadyTriggered =
      typeof pallet.pickup_selection_triggered_at === "string" &&
      pallet.pickup_selection_triggered_at.length > 0;
    const alreadyConfirmed =
      typeof pallet.pickup_producer_confirmed_at === "string" &&
      pallet.pickup_producer_confirmed_at.length > 0;

    if (!triggerReached || alreadyTriggered || alreadyConfirmed) {
      return {
        triggerReached,
        taskCreated: false,
        taskId: (pallet.pickup_selection_task_id as string | null) ?? null,
        suggestion,
      };
    }

    const taskId = await ensurePickupSelectionAdminTask({
      palletId,
      palletName: String(pallet.name ?? palletId),
      bottlesFilled: totalBottles,
      minBottlesToShip,
      triggerShare: settings.pickupSelectionTriggerShare,
      suggestion,
    });

    const now = new Date().toISOString();
    const { error: uErr } = await sb
      .from("pallets")
      .update({
        pickup_selection_triggered_at: now,
        pickup_selection_task_id: taskId,
        updated_at: now,
      })
      .eq("id", palletId)
      .is("pickup_selection_triggered_at", null);

    if (uErr) {
      console.error(
        "[evaluatePalletPickupSelection] mark triggered:",
        uErr.message,
      );
    } else {
      console.log(
        `[PALLET] Pickup selection trigger reached for ${palletId}; task=${taskId ?? "none"}`,
      );
    }

    return {
      triggerReached: true,
      taskCreated: taskId != null,
      taskId,
      suggestion,
    };
  } catch (e) {
    console.error("[evaluatePalletPickupSelection]", e);
    return {
      triggerReached: false,
      taskCreated: false,
      taskId: null,
      suggestion: noopSuggestion,
    };
  }
}

/** Build selection state for admin UI / operating summary. */
export async function getPalletPickupSelectionState(
  palletId: string,
): Promise<PalletPickupSelectionState | null> {
  const sb = getSupabaseAdmin();
  const { data: pallet, error } = await sb
    .from("pallets")
    .select(
      `
      id,
      min_bottles_to_complete,
      current_pickup_producer_id,
      pickup_producer_confirmed_at,
      pickup_producer_confirmed_by,
      pickup_selection_triggered_at,
      pickup_selection_task_id
    `,
    )
    .eq("id", palletId)
    .maybeSingle();

  if (error || !pallet) return null;

  const settings = await getPalletPhysicalSettings();
  const { totalBottles, producers } =
    await loadPalletProducerBottleCounts(palletId);
  const suggestion = suggestPickupProducer(producers, totalBottles);
  const minBottlesToShip = resolveMinBottlesToShip(
    pallet.min_bottles_to_complete,
  );
  const estimatedWeightKg = estimatePalletWeightKg(
    totalBottles,
    settings.kgPerBottle,
  );

  return {
    suggestion,
    bottlesFilled: totalBottles,
    minBottlesToShip,
    triggerReached: isPickupSelectionTriggerReached({
      bottlesFilled: totalBottles,
      minBottlesToShip,
      triggerShare: settings.pickupSelectionTriggerShare,
    }),
    triggerShare: settings.pickupSelectionTriggerShare,
    triggerBottles: Math.ceil(
      minBottlesToShip * settings.pickupSelectionTriggerShare,
    ),
    confirmed:
      typeof pallet.pickup_producer_confirmed_at === "string" &&
      pallet.pickup_producer_confirmed_at.length > 0,
    confirmedAt: (pallet.pickup_producer_confirmed_at as string | null) ?? null,
    confirmedBy: (pallet.pickup_producer_confirmed_by as string | null) ?? null,
    currentPickupProducerId:
      (pallet.current_pickup_producer_id as string | null) ?? null,
    estimatedWeightKg,
    weightLimitKg: settings.weightLimitKg,
    kgPerBottle: settings.kgPerBottle,
    weightOverLimit: isPalletWeightOverLimit(
      estimatedWeightKg,
      settings.weightLimitKg,
    ),
    selectionTriggeredAt:
      (pallet.pickup_selection_triggered_at as string | null) ?? null,
    selectionTaskId: (pallet.pickup_selection_task_id as string | null) ?? null,
  };
}

/**
 * Admin confirms (or changes) the pickup producer for a pallet.
 * Locks current_pickup_producer_id and records who/when.
 */
export async function confirmPalletPickupProducer(input: {
  palletId: string;
  producerId: string;
  adminUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabaseAdmin();
  const producerId = input.producerId?.trim();
  if (!producerId) {
    return { ok: false, error: "Missing producer id" };
  }

  const { data: pallet, error: pErr } = await sb
    .from("pallets")
    .select("id, shipping_region_id, status")
    .eq("id", input.palletId)
    .maybeSingle();

  if (pErr || !pallet) {
    return { ok: false, error: pErr?.message ?? "Pallet not found" };
  }

  const { data: producer, error: prodErr } = await sb
    .from("producers")
    .select("id, shipping_region_id, is_pallet_zone, name")
    .eq("id", producerId)
    .maybeSingle();

  if (prodErr || !producer) {
    return { ok: false, error: prodErr?.message ?? "Producer not found" };
  }

  const regionId = pallet.shipping_region_id as string | null;
  if (
    regionId &&
    producer.shipping_region_id &&
    producer.shipping_region_id !== regionId
  ) {
    return {
      ok: false,
      error: "Producer is not in this pallet's shipping region",
    };
  }

  const now = new Date().toISOString();
  const { error: uErr } = await sb
    .from("pallets")
    .update({
      current_pickup_producer_id: producerId,
      pickup_producer_confirmed_at: now,
      pickup_producer_confirmed_by: input.adminUserId,
      updated_at: now,
    })
    .eq("id", input.palletId);

  if (uErr) {
    return { ok: false, error: uErr.message };
  }

  // Mark linked admin task done when present.
  const { data: fresh } = await sb
    .from("pallets")
    .select("pickup_selection_task_id")
    .eq("id", input.palletId)
    .maybeSingle();
  const taskId = fresh?.pickup_selection_task_id as string | null | undefined;
  if (taskId) {
    const { error: taskErr } = await sb
      .from("admin_tasks")
      .update({
        status: "done",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", taskId)
      .neq("status", "done");
    if (taskErr) {
      console.error(
        "[confirmPalletPickupProducer] complete task:",
        taskErr.message,
      );
    }
  }

  console.log(
    `[PALLET] Pickup producer confirmed for ${input.palletId}: ${producerId} by ${input.adminUserId}`,
  );
  return { ok: true };
}
