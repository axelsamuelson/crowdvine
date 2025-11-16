import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CartItem = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    product: {
      id: string;
      producerId?: string;
      producerName?: string;
    };
  };
  sharedBox?: {
    id: string;
    title?: string | null;
    producerId?: string;
    producerName?: string;
    targetQuantity: number;
    totalQuantity: number;
    remainingQuantity: number;
  };
};

export type ProducerValidation = {
  producerId: string;
  producerName: string;
  producerHandle: string; // URL-friendly slug for /shop/[handle]
  quantity: number;
  isValid: boolean;
  needed: number; // bottles needed to reach next multiple of 6
  groupId?: string;
  groupName?: string;
};

export type ValidationResult = {
  isValid: boolean;
  producerValidations: ProducerValidation[];
  errors: string[];
};

/**
 * Validates that cart items follow the 6-bottle rule:
 * - Each producer must have bottles in multiples of 6 (6, 12, 18, etc.)
 * - Producers in the same group can be combined to meet the requirement
 */
export async function validateSixBottleRule(
  cartItems: CartItem[],
): Promise<ValidationResult> {
  if (!cartItems || cartItems.length === 0) {
    return {
      isValid: true,
      producerValidations: [],
      errors: [],
    };
  }

  const sb = getSupabaseAdmin();

  try {
    // 1. Get producer_id for each cart item by looking up the wine in database
    // This is more reliable than depending on cached product data
    const wineIds = cartItems.map((item) => item.merchandise.id);
    console.log(
      "🔍 [Validation] Looking up producer_ids for",
      wineIds.length,
      "wines",
      wineIds,
    );

    const { data: wines, error: winesError } = await sb
      .from("wines")
      .select("id, producer_id, wine_name, producers(id, name)")
      .in("id", wineIds);

    if (winesError) {
      console.error("❌ [Validation] Error fetching wines:", winesError);
      throw winesError;
    }

    console.log(
      "✅ [Validation] Found",
      wines?.length || 0,
      "wines with producer info",
      wines,
    );

    // Create map: wineId -> { producerId, producerName }
    const wineToProducer = new Map<string, { id: string; name: string }>();
    wines?.forEach((wine: any) => {
      if (!wine.producer_id) {
        console.warn(
          "⚠️ [Validation] Wine",
          wine.id,
          "has no producer_id",
        );
      }
      wineToProducer.set(wine.id, {
        id: wine.producer_id,
        name: wine.producers?.name || "Unknown Producer",
      });
    });

    console.log(
      "🔍 [Validation] Wine to producer map:",
      Array.from(wineToProducer.entries()),
    );

    // 2. Get all producer groups and their members
    const { data: groupMembers, error: groupError } = await sb.from(
      "producer_group_members",
    ).select(`
        group_id,
        producer_id,
        producer_groups!inner(id, name)
      `);

    if (groupError) {
      console.error("Error fetching producer groups:", groupError);
    }

    // Create map: producerId -> group info
    const producerToGroup = new Map<string, { id: string; name: string }>();
    groupMembers?.forEach((member: any) => {
      if (member.producer_groups) {
        producerToGroup.set(member.producer_id, {
          id: member.producer_groups.id,
          name: member.producer_groups.name,
        });
      }
    });

    console.log(
      "🔍 [Validation] Producer groups loaded:",
      producerToGroup.size,
    );

    // Track shared boxes for validation
    const sharedBoxStatus = new Map<
      string,
      {
        title?: string | null;
        producerId?: string;
        producerName?: string;
        targetQuantity: number;
        totalQuantity: number;
        remainingQuantity: number;
      }
    >();

    cartItems.forEach((item) => {
      if (item.sharedBox) {
        sharedBoxStatus.set(item.sharedBox.id, {
          title: item.sharedBox.title,
          producerId: item.sharedBox.producerId,
          producerName: item.sharedBox.producerName,
          targetQuantity: item.sharedBox.targetQuantity,
          totalQuantity: item.sharedBox.totalQuantity,
          remainingQuantity: item.sharedBox.remainingQuantity,
        });
      }
    });

    // 3. Group cart items by producer or group
    // Key format: "group_{groupId}" or "producer_{producerId}"
    const quantityByProducerOrGroup = new Map<
      string,
      {
        quantity: number;
        producerIds: Set<string>;
        producerNames: Set<string>;
        groupId?: string;
        groupName?: string;
      }
    >();

    for (const item of cartItems) {
      // Get producer info from our lookup map
      const wineInfo = wineToProducer.get(item.merchandise.id);
      if (!wineInfo) {
        console.warn(
          "❌ [Validation] Wine not found in database:",
          item.merchandise.id,
          "Skipping this item",
        );
        continue;
      }

      if (!wineInfo.id) {
        console.warn(
          "⚠️ [Validation] Wine",
          item.merchandise.id,
          "has no producer_id, skipping",
        );
        continue;
      }

      const producerId = wineInfo.id;
      const producerName = wineInfo.name;
      const group = producerToGroup.get(producerId);
      const key = group ? `group_${group.id}` : `producer_${producerId}`;

      if (!quantityByProducerOrGroup.has(key)) {
        quantityByProducerOrGroup.set(key, {
          quantity: 0,
          producerIds: new Set(),
          producerNames: new Set(),
          groupId: group?.id,
          groupName: group?.name,
        });
      }

      const entry = quantityByProducerOrGroup.get(key)!;
      entry.quantity += item.quantity;
      entry.producerIds.add(producerId);
      entry.producerNames.add(producerName);
    }

    console.log(
      "🔍 [Validation] Grouped by producer/group:",
      quantityByProducerOrGroup.size,
      "entries",
      Array.from(quantityByProducerOrGroup.entries()).map(([key, value]) => ({
        key,
        quantity: value.quantity,
        producerNames: Array.from(value.producerNames),
      })),
    );

    // 3. Validate each producer/group against the 6-bottle rule
    const producerValidations: ProducerValidation[] = [];
    const errors: string[] = [];

    for (const [key, entry] of quantityByProducerOrGroup) {
      const isValid = entry.quantity % 6 === 0;
      const needed = isValid ? 0 : 6 - (entry.quantity % 6);
      const producerName = Array.from(entry.producerNames).join(" + ");

      // Generate handle from producer name (same as collections API)
      const producerHandle = producerName.toLowerCase().replace(/\s+/g, "-");

      const validation: ProducerValidation = {
        producerId: Array.from(entry.producerIds)[0],
        producerName,
        producerHandle,
        quantity: entry.quantity,
        isValid,
        needed,
        groupId: entry.groupId,
        groupName: entry.groupName,
      };

      console.log("📊 [Validation] Created validation:", {
        producerName: validation.producerName,
        groupName: validation.groupName,
        groupId: validation.groupId,
        hasGroup: !!validation.groupId,
      });

      producerValidations.push(validation);

      if (!isValid) {
        const nextMultiple = entry.quantity + needed;
        if (entry.groupName) {
          errors.push(
            `${entry.groupName}: ${entry.quantity} bottles. Add ${needed} more for ${nextMultiple} total.`,
          );
        } else {
          errors.push(
            `${producerName}: ${entry.quantity} bottles. Add ${needed} more for ${nextMultiple} total.`,
          );
        }
      }
    }

    for (const [sharedBoxId, sharedBox] of sharedBoxStatus) {
      if (sharedBox.remainingQuantity <= 0) continue;
      const name =
        sharedBox.title || sharedBox.producerName || "Shared box contribution";
      producerValidations.push({
        producerId: sharedBox.producerId ?? sharedBoxId,
        producerName: name,
        producerHandle: name.toLowerCase().replace(/\s+/g, "-"),
        quantity: sharedBox.totalQuantity,
        isValid: false,
        needed: sharedBox.remainingQuantity,
        groupId: sharedBoxId,
        groupName: "Shared box",
      });
      errors.push(
        `${name} needs ${sharedBox.remainingQuantity} more bottle(s) before checkout.`,
      );
    }

    const isValid = producerValidations.every((v) => v.isValid);

    console.log("✅ [Validation] Result:", {
      isValid,
      totalProducers: producerValidations.length,
      invalidCount: errors.length,
    });

    return {
      isValid,
      producerValidations,
      errors,
    };
  } catch (error) {
    console.error("❌ [Validation] Error:", error);
    // In case of error, allow checkout to proceed (fail open)
    return {
      isValid: true,
      producerValidations: [],
      errors: [],
    };
  }
}
