import { NextResponse } from "next/server";
import {
  AdminAuthError,
  requireAdmin,
  type AdminUser,
} from "@/lib/admin-auth-server";

/** Run requireAdmin. 401 without a session, 403 with a session that is not admin. */
export async function requireAdminOr401(): Promise<
  AdminUser | NextResponse
> {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json(
        {
          error: e.status === 403 ? "Forbidden" : e.message,
        },
        { status: e.status },
      );
    }
    const msg = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json(
      { error: msg === "Admin authentication required" ? msg : "Unauthorized" },
      { status: 401 },
    );
  }
}

export function isUnauthorizedResponse(
  value: AdminUser | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
