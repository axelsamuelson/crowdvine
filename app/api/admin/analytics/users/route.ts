import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  getExcludedProfileIds,
  isExcludedUserId,
} from "@/lib/analytics/excluded-profile-ids";
import { furthestLoggedInStep } from "@/lib/analytics/funnel-step-badge";

type JourneyRow = {
  user_id: string;
  access_requested_at?: string | null;
  access_approved_at?: string | null;
  first_login_at?: string | null;
  first_product_view_at?: string | null;
  first_add_to_cart_at?: string | null;
  cart_validation_passed_at?: string | null;
  checkout_started_at?: string | null;
  reservation_completed_at?: string | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  has_no_events?: boolean;
};

async function loadJourneyUsers(
  sb: ReturnType<typeof getSupabaseAdmin>,
  excluded: Set<string>,
): Promise<{ users: JourneyRow[]; funnel: Record<string, number> }> {
  const { data, error } = await sb.from("user_journey_funnel").select(`
      user_id,
      access_requested_at,
      access_approved_at,
      first_login_at,
      first_product_view_at,
      first_add_to_cart_at,
      cart_validation_passed_at,
      checkout_started_at,
      reservation_completed_at,
      profiles(full_name, email)
    `);

  let journeyUsers: JourneyRow[] = [];

  if (error) {
    console.warn("[users] user_journey_funnel:", error.message);
    const { data: eventsData, error: eventsError } = await sb
      .from("user_events")
      .select("user_id, event_type, created_at, event_metadata")
      .not("user_id", "is", null);

    if (eventsError) throw eventsError;

    const usersMap = new Map<string, JourneyRow>();
    for (const event of eventsData ?? []) {
      if (isExcludedUserId(event.user_id, excluded)) continue;
      const md = event.event_metadata as Record<string, unknown> | null;
      if (md && md.internal === true) continue;
      if (!usersMap.has(event.user_id)) {
        usersMap.set(event.user_id, { user_id: event.user_id });
      }
      const user = usersMap.get(event.user_id)!;
      const t = event.created_at as string;
      if (event.event_type === "access_request_submitted" && !user.access_requested_at)
        user.access_requested_at = t;
      else if (event.event_type === "access_approved" && !user.access_approved_at)
        user.access_approved_at = t;
      else if (event.event_type === "user_first_login" && !user.first_login_at)
        user.first_login_at = t;
      else if (event.event_type === "product_viewed" && !user.first_product_view_at)
        user.first_product_view_at = t;
      else if (event.event_type === "add_to_cart" && !user.first_add_to_cart_at)
        user.first_add_to_cart_at = t;
      else if (
        event.event_type === "cart_validation_passed" &&
        !user.cart_validation_passed_at
      )
        user.cart_validation_passed_at = t;
      else if (event.event_type === "checkout_started" && !user.checkout_started_at)
        user.checkout_started_at = t;
      else if (
        event.event_type === "reservation_completed" &&
        !user.reservation_completed_at
      )
        user.reservation_completed_at = t;
    }
    journeyUsers = Array.from(usersMap.values());
  } else {
    journeyUsers = ((data ?? []) as JourneyRow[]).filter(
      (u) => !isExcludedUserId(u.user_id, excluded),
    );
  }

  const userIds = journeyUsers.map((u) => u.user_id);
  const profilesMap = new Map<
    string,
    { full_name: string | null; email: string | null }
  >();

  if (userIds.length > 0) {
    for (let i = 0; i < userIds.length; i += 200) {
      const chunk = userIds.slice(i, i + 200);
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, full_name, email")
        .in("id", chunk);
      for (const p of profiles ?? []) {
        profilesMap.set(p.id, {
          full_name: p.full_name ?? null,
          email: p.email ?? null,
        });
      }
    }
  }

  const withProfiles = journeyUsers.map((u) => ({
    ...u,
    profiles: profilesMap.get(u.user_id) || u.profiles || null,
  }));

  const { data: allProfiles } = await sb
    .from("profiles")
    .select("id, full_name, email");

  if (allProfiles) {
    const withEvents = new Set(withProfiles.map((u) => u.user_id));
    for (const p of allProfiles) {
      if (withEvents.has(p.id) || isExcludedUserId(p.id, excluded)) continue;
      withProfiles.push({
        user_id: p.id,
        has_no_events: true,
        profiles: { full_name: p.full_name, email: p.email },
      });
    }
  }

  const withActivity = withProfiles.filter((u) => !u.has_no_events);
  const funnel = {
    total_users: withProfiles.length,
    access_requested: withActivity.filter((u) => u.access_requested_at).length,
    access_approved: withActivity.filter((u) => u.access_approved_at).length,
    first_login: withActivity.filter((u) => u.first_login_at).length,
    first_product_view: withActivity.filter((u) => u.first_product_view_at)
      .length,
    first_add_to_cart: withActivity.filter((u) => u.first_add_to_cart_at)
      .length,
    cart_validation_passed: withActivity.filter(
      (u) => u.cart_validation_passed_at,
    ).length,
    checkout_started: withActivity.filter((u) => u.checkout_started_at).length,
    reservation_completed: withActivity.filter((u) => u.reservation_completed_at)
      .length,
  };

  return { users: withProfiles, funnel };
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const sb = getSupabaseAdmin();
  const excluded = await getExcludedProfileIds(sb);

  try {
    // Drill-down: events for one user
    if (userId) {
      if (isExcludedUserId(userId, excluded)) {
        return NextResponse.json({ error: "User excluded" }, { status: 404 });
      }
      const { data, error } = await sb
        .from("user_events")
        .select(
          "id, session_id, event_type, event_category, event_metadata, page_url, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const events = data ?? [];
      const bySession = new Map<string, typeof events>();
      for (const e of events) {
        const sid = e.session_id || "unknown";
        if (!bySession.has(sid)) bySession.set(sid, []);
        bySession.get(sid)!.push(e);
      }

      const sessions = Array.from(bySession.entries()).map(
        ([session_id, sessionEvents]) => {
          const sorted = [...sessionEvents].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
          const last = sorted[0]?.created_at ?? null;
          return {
            session_id,
            last_seen_at: last,
            events: sorted.map((e) => ({
              event_type: e.event_type,
              event_category: e.event_category,
              event_metadata: e.event_metadata,
              page_url: e.page_url,
              created_at: e.created_at,
            })),
          };
        },
      );
      sessions.sort(
        (a, b) =>
          new Date(b.last_seen_at || 0).getTime() -
          new Date(a.last_seen_at || 0).getTime(),
      );

      return NextResponse.json({ userId, sessions, events });
    }

    const { users: journeyUsers, funnel } = await loadJourneyUsers(
      sb,
      excluded,
    );

    // Event counts + last_seen from user_events (paginated)
    const counts = new Map<
      string,
      {
        product_views: number;
        add_to_carts: number;
        reservations: number;
        last_seen: string | null;
      }
    >();
    const pageSize = 1000;
    const sinceActive = new Date(
      Date.now() - 28 * 24 * 60 * 60 * 1000,
    ).toISOString();

    for (let from = 0; from < 50000; from += pageSize) {
      const { data, error } = await sb
        .from("user_events")
        .select("user_id, event_type, created_at, event_metadata")
        .not("user_id", "is", null)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const batch = data ?? [];
      for (const e of batch) {
        if (isExcludedUserId(e.user_id, excluded)) continue;
        const md = e.event_metadata as Record<string, unknown> | null;
        if (md && md.internal === true) continue;
        let c = counts.get(e.user_id);
        if (!c) {
          c = {
            product_views: 0,
            add_to_carts: 0,
            reservations: 0,
            last_seen: null,
          };
          counts.set(e.user_id, c);
        }
        if (!c.last_seen || e.created_at > c.last_seen) {
          c.last_seen = e.created_at;
        }
        if (e.event_type === "product_viewed") c.product_views += 1;
        if (e.event_type === "add_to_cart") c.add_to_carts += 1;
        if (e.event_type === "reservation_completed") c.reservations += 1;
      }
      if (batch.length < pageSize) break;
    }

    const now = Date.now();
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d28 = now - 28 * 24 * 60 * 60 * 1000;

    let active_7d = 0;
    let active_28d = 0;
    for (const c of counts.values()) {
      if (!c.last_seen) continue;
      const t = new Date(c.last_seen).getTime();
      if (t >= d7) active_7d += 1;
      if (t >= d28) active_28d += 1;
    }

    const users = journeyUsers.map((u) => {
      const c = counts.get(u.user_id);
      return {
        user_id: u.user_id,
        email: u.profiles?.email ?? null,
        full_name: u.profiles?.full_name ?? null,
        first_login_at: u.first_login_at ?? null,
        last_seen_at: c?.last_seen ?? u.first_login_at ?? null,
        product_views: c?.product_views ?? 0,
        add_to_carts: c?.add_to_carts ?? 0,
        reservations: c?.reservations ?? 0,
        furthest_step: furthestLoggedInStep(u),
        // Keep raw journey fields for parity with old User Journeys
        access_requested_at: u.access_requested_at ?? null,
        access_approved_at: u.access_approved_at ?? null,
        first_product_view_at: u.first_product_view_at ?? null,
        first_add_to_cart_at: u.first_add_to_cart_at ?? null,
        cart_validation_passed_at: u.cart_validation_passed_at ?? null,
        checkout_started_at: u.checkout_started_at ?? null,
        reservation_completed_at: u.reservation_completed_at ?? null,
        has_no_events: !!u.has_no_events,
      };
    });

    users.sort((a, b) => {
      const at = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bt = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return bt - at;
    });

    return NextResponse.json({
      funnel,
      summary: {
        total_users: funnel.total_users,
        active_7d,
        active_28d,
        users_with_add_to_cart: funnel.first_add_to_cart,
        users_with_reservation: funnel.reservation_completed,
      },
      users,
      sinceActive,
    });
  } catch (err) {
    console.error("Analytics users API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch user analytics" },
      { status: 500 },
    );
  }
}
