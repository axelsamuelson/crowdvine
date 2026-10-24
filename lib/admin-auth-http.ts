import { NextResponse } from "next/server";
import { requireAdmin, type AdminUser } from "@/lib/admin-auth-server";

/** Run requireAdmin; return 401 response on failure, else the admin user. */
export async function requireAdminOr401(): Promise<
  AdminUser | NextResponse
> {
  try {
    return await requireAdmin();
  } catch (e) {
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
