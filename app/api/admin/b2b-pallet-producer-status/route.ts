import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  b2bPalletWriteHttpError,
  upsertB2bProducerStatus,
} from "@/lib/admin/b2b-pallet-writes";

async function upsertProducerStatus(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const saved = await upsertB2bProducerStatus(sb, body, admin.id);
  return NextResponse.json(saved);
}

export async function POST(request: NextRequest) {
  try {
    return await upsertProducerStatus(request);
  } catch (err) {
    const mapped = b2bPalletWriteHttpError(err);
    if (mapped.status >= 500) {
      console.error("[b2b-pallet-producer-status] POST:", err);
    }
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return await upsertProducerStatus(request);
  } catch (err) {
    const mapped = b2bPalletWriteHttpError(err);
    if (mapped.status >= 500) {
      console.error("[b2b-pallet-producer-status] PATCH:", err);
    }
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
