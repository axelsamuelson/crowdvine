import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getProducerShareSignupContext } from "@/lib/producer-share-account";
import { signupLimiter, getClientIdentifier } from "@/lib/rate-limiter";

const bodySchema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(8).max(200),
  full_name: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  if (!signupLimiter.isAllowed(identifier)) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  const context = await getProducerShareSignupContext(parsed.data.token);
  if (!context) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 401 },
    );
  }

  const email = context.email;
  if (!email) {
    return NextResponse.json(
      {
        error:
          "No contact email is set for this producer. Ask CrowdVine to add it first.",
      },
      { status: 400 },
    );
  }

  const password = parsed.data.password;
  const fullName = parsed.data.full_name?.trim() || null;
  const sb = getSupabaseAdmin();

  const { data: linkedProfile } = await sb
    .from("profiles")
    .select("id")
    .eq("producer_id", context.producerId)
    .limit(1)
    .maybeSingle();

  if (linkedProfile) {
    return NextResponse.json(
      {
        error: "An account already exists for this producer. Log in instead.",
        code: "account_exists",
      },
      { status: 409 },
    );
  }

  const { data: created, error: createError } =
    await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "producer", full_name: fullName },
    });

  if (createError || !created.user) {
    const message = createError?.message || "Could not create account";
    const already =
      /already|registered|exists/i.test(message) ||
      createError?.status === 422;
    return NextResponse.json(
      {
        error: already
          ? "An account with this email already exists. Log in instead."
          : message,
        code: already ? "email_exists" : "create_failed",
      },
      { status: already ? 409 : 400 },
    );
  }

  const userId = created.user.id;
  const nowIso = new Date().toISOString();
  const profileRow = {
    id: userId,
    email,
    full_name: fullName,
    role: "producer",
    roles: ["user", "producer"],
    portal_access: ["user"],
    producer_id: context.producerId,
    access_granted_at: nowIso,
    updated_at: nowIso,
  };

  const { error: profileError } = await sb
    .from("profiles")
    .upsert(profileRow, { onConflict: "id" });

  if (profileError) {
    console.error("[producer/signup] profile:", profileError);
    await sb.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Could not create producer profile" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    email,
    producerId: context.producerId,
    shipmentId: context.shipmentId,
  });
}
