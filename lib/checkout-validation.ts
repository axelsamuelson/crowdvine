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
};

export type ProducerValidation = {
  producerId: string;
  producerName: string;
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
  cartItems: CartItem[]
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
    // 1. Get all producer groups and their members
    const { data: groupMembers, error: groupError } = await sb
      .from("producer_group_members")
      .select(`
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

    console.log("🔍 [Validation] Producer groups loaded:", producerToGroup.size);

    // 2. Group cart items by producer or group
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
      const producerId = item.merchandise.product.producerId;
      if (!producerId) {
        console.warn("Cart item missing producerId:", item);
        continue;
      }

      const producerName = item.merchandise.product.producerName || "Unknown";
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
      "entries"
    );

    // 3. Validate each producer/group against the 6-bottle rule
    const producerValidations: ProducerValidation[] = [];
    const errors: string[] = [];

    for (const [key, entry] of quantityByProducerOrGroup) {
      const isValid = entry.quantity % 6 === 0;
      const needed = isValid ? 0 : 6 - (entry.quantity % 6);
      const producerName = Array.from(entry.producerNames).join(" + ");

      const validation: ProducerValidation = {
        producerId: Array.from(entry.producerIds)[0],
        producerName,
        quantity: entry.quantity,
        isValid,
        needed,
        groupId: entry.groupId,
        groupName: entry.groupName,
      };

      producerValidations.push(validation);

      if (!isValid) {
        const nextMultiple = entry.quantity + needed;
        if (entry.groupName) {
          errors.push(
            `${entry.groupName}: ${entry.quantity} bottles. Add ${needed} more for ${nextMultiple} total.`
          );
        } else {
          errors.push(
            `${producerName}: ${entry.quantity} bottles. Add ${needed} more for ${nextMultiple} total.`
          );
        }
      }
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

