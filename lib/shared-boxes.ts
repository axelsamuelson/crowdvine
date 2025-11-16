import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { CartService } from "@/src/lib/cart-service";
import type {
  SharedBoxMeta,
  SharedBoxParticipant,
} from "@/lib/shopify/types";

type CreateSharedBoxPayload = {
  producerId: string;
  producerName?: string;
  wineId?: string;
  title?: string;
  inviteeIds?: string[];
  initialQuantity?: number;
};

export async function listSharedBoxesForUser(): Promise<SharedBoxMeta[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const sb = getSupabaseAdmin();
  const boxIds = Array.from(
    new Set([
      ...(await participantBoxIds(user.id)),
      ...(await creatorBoxIds(user.id)),
    ]),
  );

  if (boxIds.length === 0) {
    return [];
  }

  const { data, error } = await sb
    .from("shared_boxes")
    .select(
      `
      id,
      producer_id,
      producer_name,
      title,
      status,
      target_quantity,
      total_quantity,
      remaining_quantity,
      created_by,
      shared_box_participants (
        user_id,
        role,
        invite_status,
        contribution_bottles,
        profiles (
          full_name,
          avatar_url
        )
      )
    `,
    )
    .in("id", boxIds);

  if (error || !data) {
    console.error("Failed to load shared boxes:", error);
    return [];
  }

  return data.map((box) => ({
    id: box.id,
    producerId: box.producer_id,
    producerName: box.producer_name,
    title: box.title,
    status: box.status,
    targetQuantity: box.target_quantity,
    totalQuantity: box.total_quantity,
    remainingQuantity: box.remaining_quantity,
    createdBy: box.created_by,
    participants:
      box.shared_box_participants?.map(
        (participant): SharedBoxParticipant => ({
          userId: participant.user_id,
          role: participant.role,
          inviteStatus: participant.invite_status,
          contributionBottles: participant.contribution_bottles,
          fullName: participant.profiles?.full_name ?? undefined,
          avatarUrl: participant.profiles?.avatar_url ?? undefined,
          isCurrentUser: participant.user_id === user.id,
        }),
      ) ?? [],
  }));
}

async function participantBoxIds(userId: string) {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("shared_box_participants")
    .select("shared_box_id")
    .eq("user_id", userId);
  return data?.map((row) => row.shared_box_id) ?? [];
}

async function creatorBoxIds(userId: string) {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("shared_boxes")
    .select("id")
    .eq("created_by", userId);
  return data?.map((row) => row.id) ?? [];
}

export async function createSharedBox({
  producerId,
  producerName,
  wineId,
  title,
  inviteeIds = [],
  initialQuantity = 1,
}: CreateSharedBoxPayload) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const sb = getSupabaseAdmin();

  const { data: box, error } = await sb
    .from("shared_boxes")
    .insert({
      producer_id: producerId,
      producer_name: producerName,
      created_by: user.id,
      title:
        title ||
        `${producerName ?? "Producer"} shared box ${new Date().getMonth() + 1}`,
      status: "open",
      target_quantity: 6,
      remaining_quantity: 6,
    })
    .select("id")
    .single();

  if (error || !box) {
    console.error("Failed to create shared box:", error);
    throw new Error("Unable to create shared box");
  }

  const participantRows = [
    {
      shared_box_id: box.id,
      user_id: user.id,
      role: "owner",
      invite_status: "accepted",
    },
    ...inviteeIds.map((invitee) => ({
      shared_box_id: box.id,
      user_id: invitee,
      role: "member",
      invite_status: "pending",
    })),
  ];

  const { error: participantError } = await sb
    .from("shared_box_participants")
    .insert(participantRows);

  if (participantError) {
    console.error("Failed to add participants:", participantError);
  }

  if (wineId) {
    await addWineToSharedBox(box.id, wineId, initialQuantity);
  }

  return box.id;
}

export async function addWineToSharedBox(
  sharedBoxId: string,
  wineId: string,
  quantity: number,
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const sb = getSupabaseAdmin();

  const { data: box, error: boxError } = await sb
    .from("shared_boxes")
    .select("*")
    .eq("id", sharedBoxId)
    .single();

  if (boxError || !box) {
    throw new Error("Shared box not found");
  }

  const { error: participantError } = await sb
    .from("shared_box_participants")
    .select("id")
    .eq("shared_box_id", sharedBoxId)
    .eq("user_id", user.id)
    .single();

  if (participantError) {
    throw new Error("Join the box before contributing");
  }

  await CartService.addItem(wineId, quantity, sharedBoxId);

  await sb.from("shared_box_items").insert({
    shared_box_id: sharedBoxId,
    wine_id: wineId,
    added_by: user.id,
    quantity,
  });

  await sb
    .from("shared_boxes")
    .update({
      total_quantity: (box.total_quantity ?? 0) + quantity,
      remaining_quantity: Math.max(
        (box.remaining_quantity ?? 0) - quantity,
        0,
      ),
    })
    .eq("id", sharedBoxId);

  const { data: participant } = await sb
    .from("shared_box_participants")
    .select("contribution_bottles")
    .eq("shared_box_id", sharedBoxId)
    .eq("user_id", user.id)
    .single();

  await sb
    .from("shared_box_participants")
    .update({
      contribution_bottles:
        (participant?.contribution_bottles ?? 0) + Math.max(quantity, 0),
    })
    .eq("shared_box_id", sharedBoxId)
    .eq("user_id", user.id);
}

export async function followUser(targetUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("user_follows").insert({
    follower_id: user.id,
    followed_id: targetUserId,
  });
  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function unfollowUser(targetUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const sb = getSupabaseAdmin();
  await sb
    .from("user_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followed_id", targetUserId);
}

