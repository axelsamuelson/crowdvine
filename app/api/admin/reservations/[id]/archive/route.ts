import { NextRequest, NextResponse } from "next/server";
import { isUnauthorizedResponse, requireAdminOr401 } from "@/lib/admin-auth-http";
import {
  archiveReservation,
  unarchiveReservation,
} from "@/lib/reservations/archive";
import { z } from "zod";

const archiveBodySchema = z
  .object({
    reason: z.string().max(500).optional().nullable(),
  })
  .strict()
  .optional();

/**
 * POST — soft-archive reservation (no email, no delete).
 * DELETE — unarchive (restore status_before_archive).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const { id } = await params;
  let reason: string | null = null;
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = archiveBodySchema.safeParse(raw);
    if (parsed.success && parsed.data?.reason != null) {
      reason = parsed.data.reason;
    }
  } catch {
    // empty body ok
  }

  const result = await archiveReservation({ reservationId: id, reason });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 },
    );
  }
  return NextResponse.json({ success: true, reservation: result.reservation });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminAuth = await requireAdminOr401();
  if (isUnauthorizedResponse(adminAuth)) return adminAuth;

  const { id } = await params;
  const result = await unarchiveReservation({ reservationId: id });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 },
    );
  }
  return NextResponse.json({ success: true, reservation: result.reservation });
}
