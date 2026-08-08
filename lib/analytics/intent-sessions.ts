import { stockholmWeekStartKey } from "@/lib/analytics/stockholm-time";

/** Verbatim intent-session definition (shown in Nära köp info popover). */
export const INTENT_SESSION_DEFINITION =
  "clean session with add_to_cart or checkout, no reservation in-session, and for known users no reservation within 7 days";
export type IntentWine = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

export type IntentSessionRow = {
  session_id: string;
  site?: string | null;
  user_id: string | null;
  started_at: string;
  last_seen_at: string;
  wines: IntentWine[];
  cart_value: number;
  reached_checkout: boolean;
  last_checkout_phase: string | null;
  abandoned_phase: string | null;
  last_step: string;
};

export type CleanEventRow = {
  session_id: string;
  visitor_id?: string | null;
  user_id: string | null;
  event_type: string;
  event_metadata: unknown;
  created_at: string;
  page_url?: string | null;
  site?: string | null;
};

type Meta = Record<string, unknown>;

function asMeta(raw: unknown): Meta {
  return raw && typeof raw === "object" ? (raw as Meta) : {};
}

function productKey(meta: Meta): string | null {
  const id = meta.productId ?? meta.merchandiseId;
  if (typeof id !== "string" || !id || id === "test") return null;
  return id;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function buildIntentSessionsFromCleanEvents(
  events: CleanEventRow[],
  reservationsByUser: Map<string, string[]>, // user_id -> created_at ISO list
): IntentSessionRow[] {
  const bySession = new Map<string, CleanEventRow[]>();
  for (const e of events) {
    const meta = asMeta(e.event_metadata);
    if (meta.productId === "test") continue;
    if (!bySession.has(e.session_id)) bySession.set(e.session_id, []);
    bySession.get(e.session_id)!.push(e);
  }

  const intentTypes = new Set([
    "add_to_cart",
    "remove_from_cart",
    "checkout_started",
    "checkout_step_viewed",
    "checkout_abandoned",
  ]);

  const rows: IntentSessionRow[] = [];

  for (const [sessionId, sessionEvents] of bySession) {
    sessionEvents.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const intentEvents = sessionEvents.filter((e) =>
      intentTypes.has(e.event_type),
    );
    if (intentEvents.length === 0) continue;

    const hasAdd = sessionEvents.some((e) => e.event_type === "add_to_cart");
    const reachedCheckout = sessionEvents.some((e) =>
      [
        "checkout_started",
        "checkout_step_viewed",
        "checkout_abandoned",
      ].includes(e.event_type),
    );
    if (!hasAdd && !reachedCheckout) continue;

    if (sessionEvents.some((e) => e.event_type === "reservation_completed")) {
      continue;
    }

    let userId: string | null = null;
    for (let i = sessionEvents.length - 1; i >= 0; i--) {
      if (sessionEvents[i].user_id) {
        userId = sessionEvents[i].user_id;
        break;
      }
    }

    const startedAt = intentEvents[0].created_at;
    const lastSeenAt = sessionEvents[sessionEvents.length - 1].created_at;
    const startedMs = new Date(startedAt).getTime();
    const windowEnd = startedMs + 7 * 24 * 60 * 60 * 1000;

    if (userId) {
      const resDates = reservationsByUser.get(userId) ?? [];
      const converted = resDates.some((iso) => {
        const t = new Date(iso).getTime();
        return t >= startedMs && t < windowEnd;
      });
      if (converted) continue;
    }

    const wineMap = new Map<
      string,
      { productName: string; quantity: number; price: number }
    >();

    for (const e of sessionEvents) {
      if (
        e.event_type !== "add_to_cart" &&
        e.event_type !== "remove_from_cart"
      ) {
        continue;
      }
      const meta = asMeta(e.event_metadata);
      const key = productKey(meta);
      if (!key) continue;
      const cur = wineMap.get(key) ?? {
        productName:
          typeof meta.productName === "string" ? meta.productName : key,
        quantity: 0,
        price: 0,
      };
      if (e.event_type === "add_to_cart") {
        cur.quantity += num(meta.quantity, 1);
        cur.price = Math.max(cur.price, num(meta.price, 0));
        if (typeof meta.productName === "string") {
          cur.productName = meta.productName;
        }
      } else {
        const removeQty = meta.quantity != null ? num(meta.quantity, 0) : 999999;
        cur.quantity -= removeQty;
      }
      wineMap.set(key, cur);
    }

    const wines: IntentWine[] = [];
    let cartValue = 0;
    for (const [productId, w] of wineMap) {
      if (w.quantity <= 0) continue;
      wines.push({
        productId,
        productName: w.productName,
        quantity: w.quantity,
        price: w.price,
      });
      cartValue += w.quantity * w.price;
    }
    wines.sort((a, b) => a.productName.localeCompare(b.productName));

    let lastCheckoutPhase: string | null = null;
    let abandonedPhase: string | null = null;
    let hasAbandoned = false;
    for (const e of sessionEvents) {
      const meta = asMeta(e.event_metadata);
      if (e.event_type === "checkout_step_viewed" && typeof meta.phase === "string") {
        lastCheckoutPhase = meta.phase;
      }
      if (e.event_type === "checkout_abandoned") {
        hasAbandoned = true;
        if (typeof meta.phase === "string") abandonedPhase = meta.phase;
      }
    }

    let lastStep = "add_to_cart";
    if (hasAbandoned) {
      lastStep = `abandoned:${abandonedPhase ?? lastCheckoutPhase ?? "unknown"}`;
    } else if (reachedCheckout) {
      lastStep = `checkout:${lastCheckoutPhase ?? "started"}`;
    }

    rows.push({
      session_id: sessionId,
      user_id: userId,
      started_at: startedAt,
      last_seen_at: lastSeenAt,
      wines,
      cart_value: cartValue,
      reached_checkout: reachedCheckout,
      last_checkout_phase: lastCheckoutPhase,
      abandoned_phase: abandonedPhase,
      last_step: lastStep,
    });
  }

  rows.sort(
    (a, b) =>
      new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime(),
  );
  return rows;
}

export type WeeklyFunnelRow = {
  week_start: string;
  sessions: number;
  sessions_with_product_view: number;
  sessions_with_add_to_cart: number;
  sessions_with_checkout: number;
  sessions_with_reservation: number;
};

function weekStartStockholm(iso: string): string {
  return stockholmWeekStartKey(iso);
}

export function buildWeeklyFunnelFromCleanEvents(
  events: CleanEventRow[],
  reservationsByUser: Map<string, string[]>,
  days: number,
): WeeklyFunnelRow[] {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = events.filter(
    (e) => new Date(e.created_at).getTime() >= since,
  );

  type Agg = {
    types: Set<string>;
    userIds: Set<string>;
    minAt: number;
    maxAt: number;
  };
  const sessions = new Map<string, Agg>();

  for (const e of filtered) {
    const meta = asMeta(e.event_metadata);
    if (meta.productId === "test") continue;
    let agg = sessions.get(e.session_id);
    if (!agg) {
      agg = {
        types: new Set(),
        userIds: new Set(),
        minAt: new Date(e.created_at).getTime(),
        maxAt: new Date(e.created_at).getTime(),
      };
      sessions.set(e.session_id, agg);
    }
    agg.types.add(e.event_type);
    if (e.user_id) agg.userIds.add(e.user_id);
    const t = new Date(e.created_at).getTime();
    if (t < agg.minAt) agg.minAt = t;
    if (t > agg.maxAt) agg.maxAt = t;
  }

  const byWeek = new Map<
    string,
    {
      sessions: Set<string>;
      product: Set<string>;
      cart: Set<string>;
      checkout: Set<string>;
      reservation: Set<string>;
    }
  >();

  const ensureWeek = (key: string) => {
    if (!byWeek.has(key)) {
      byWeek.set(key, {
        sessions: new Set(),
        product: new Set(),
        cart: new Set(),
        checkout: new Set(),
        reservation: new Set(),
      });
    }
    return byWeek.get(key)!;
  };

  for (const [sid, agg] of sessions) {
    const week = weekStartStockholm(new Date(agg.minAt).toISOString());
    const bucket = ensureWeek(week);
    bucket.sessions.add(sid);
    if (agg.types.has("product_viewed")) bucket.product.add(sid);
    if (agg.types.has("add_to_cart")) bucket.cart.add(sid);
    if (
      agg.types.has("checkout_started") ||
      agg.types.has("checkout_step_viewed") ||
      agg.types.has("checkout_abandoned")
    ) {
      bucket.checkout.add(sid);
    }
    if (agg.types.has("reservation_completed")) {
      bucket.reservation.add(sid);
    } else {
      // Attribute conversion via order_reservations for known users in session window (+1d)
      for (const uid of agg.userIds) {
        const dates = reservationsByUser.get(uid) ?? [];
        const hit = dates.some((iso) => {
          const t = new Date(iso).getTime();
          return t >= agg.minAt && t <= agg.maxAt + 24 * 60 * 60 * 1000;
        });
        if (hit) {
          bucket.reservation.add(sid);
          break;
        }
      }
    }
  }

  // Fill last N weeks continuously
  const result: WeeklyFunnelRow[] = [];
  const now = new Date();
  const currentWeek = weekStartStockholm(now.toISOString());
  const weeksNeeded = Math.max(1, Math.ceil(days / 7));
  for (let i = weeksNeeded - 1; i >= 0; i--) {
    const d = new Date(`${currentWeek}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const key = d.toISOString().slice(0, 10);
    const b = byWeek.get(key);
    result.push({
      week_start: key,
      sessions: b?.sessions.size ?? 0,
      sessions_with_product_view: b?.product.size ?? 0,
      sessions_with_add_to_cart: b?.cart.size ?? 0,
      sessions_with_checkout: b?.checkout.size ?? 0,
      sessions_with_reservation: b?.reservation.size ?? 0,
    });
  }
  return result;
}

export type CleanMetrics28d = {
  visitors: number;
  intent_sessions: number;
  reservations: number;
  conversion_pct: number;
};
